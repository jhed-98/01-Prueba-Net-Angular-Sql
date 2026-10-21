using System.Text;
using Asp.Versioning;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Enrichers.OpenTelemetry;
using Serilog.Sinks.RabbitMQ;
using WinServices.Api.Api.Extensions;
using WinServices.Api.Api.Filters;
using WinServices.Api.Api.Logging;
using WinServices.Api.Api.Middleware;
using WinServices.Api.Application;
using WinServices.Api.Infrastructure;
using WinServices.Api.Infrastructure.Middleware;

// ── Serilog: logger mínimo de arranque (antes de leer appsettings) ────────────
Serilog.Debugging.SelfLog.Enable(Console.Error);
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new WinServicesApiJsonFormatter())
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog — configuración completa con formato estructurado estándar ────
    // Produce JSON con el shape: timestamp, level, service, version, environment,
    // traceId, spanId, correlationId, userId, message, exception, context{}, http{}.
    builder.Host.UseSerilog((ctx, services, cfg) =>
    {
        var formatter   = new WinServicesApiJsonFormatter();
        var environment = ctx.HostingEnvironment.EnvironmentName.ToLowerInvariant();
        var serviceNameRaw = ctx.Configuration["OpenTelemetry:ServiceName"];
        var serviceName = string.IsNullOrWhiteSpace(serviceNameRaw) ? "WinServices.Api" : serviceNameRaw;
        var version     = ctx.Configuration["App:Version"] ?? "1.0.0";

        cfg.ReadFrom.Configuration(ctx.Configuration)
           .ReadFrom.Services(services)
           // ── Propiedades fijas del servicio ────────────────────────────────
           .Enrich.FromLogContext()
           .Enrich.WithProperty("ServiceName",    serviceName)
           .Enrich.WithProperty("ServiceVersion", version)
           .Enrich.WithProperty("EnvironmentName", environment)
           // ── TraceId y SpanId del Activity de OpenTelemetry activo ─────────
           .Enrich.WithOpenTelemetryTraceId()
           .Enrich.WithOpenTelemetrySpanId()
           // ── Sinks ─────────────────────────────────────────────────────────
           .WriteTo.Console(formatter)
           .WriteTo.File(
               formatter: formatter,
               path: "logs/winservices.api-.log",
               rollingInterval: RollingInterval.Day,
               retainedFileCountLimit: 7);

        var rabbitHost = ctx.Configuration["RabbitMQ:Host"];
        if (!string.IsNullOrWhiteSpace(rabbitHost))
        {
            var clientConfig = new RabbitMQClientConfiguration
            {
                Hostnames    = { rabbitHost },
                Port         = int.TryParse(ctx.Configuration["RabbitMQ:Port"], out var p) ? p : 5672,
                Username     = ctx.Configuration["RabbitMQ:Username"] ?? "guest",
                Password     = ctx.Configuration["RabbitMQ:Password"] ?? "guest",
                Exchange     = ctx.Configuration["RabbitMQ:LogsExchange"] ?? "logs_exchange",
                ExchangeType = "fanout",
                DeliveryMode = RabbitMQDeliveryMode.Durable
            };
            var sinkConfig = new RabbitMQSinkConfiguration { TextFormatter = formatter };
            cfg.WriteTo.RabbitMQ(clientConfig, sinkConfig);
        }
    });

    // ── Controladores + JSON ──────────────────────────────────────────────────
    builder.Services.AddControllers(options =>
        {
            options.Filters.Add<ValidationFilter>();
        })
        .AddJsonOptions(options =>
            options.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter()));

    // ── OpenAPI (nativo .NET 10) ──────────────────────────────────────────────
    builder.Services.AddOpenApi(options =>
    {
        // Workaround: NullReferenceException en XmlCommentOperationTransformer
        // cuando metadata es null para parámetros sin ModelMetadata (.NET 10 bug)
        options.AddOperationTransformer((operation, context, ct) =>
        {
            if (operation.Parameters != null)
            {
                for (int i = operation.Parameters.Count - 1; i >= 0; i--)
                {
                    if (operation.Parameters[i].Schema == null)
                        operation.Parameters.RemoveAt(i);
                }
            }
            return Task.CompletedTask;
        });
    });

    // ── OpenTelemetry — trazas distribuidas ──────────────────────────────────
    // Canal de alta performance: API → OTLP/gRPC → Jaeger → OpenSearch + Jaeger UI :16686.
    // El exporter OTLP se activa solo cuando "OpenTelemetry:OtlpEndpoint" está configurado.
    var serviceNameRaw = builder.Configuration["OpenTelemetry:ServiceName"];
    var serviceName    = string.IsNullOrWhiteSpace(serviceNameRaw) ? "WinServices.Api" : serviceNameRaw;
    var otlpEndpoint = builder.Configuration["OpenTelemetry:OtlpEndpoint"];
    var version      = builder.Configuration["App:Version"] ?? "1.0.0";

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService(
            serviceName: serviceName,
            serviceVersion: version,
            serviceInstanceId: Environment.MachineName))
        .WithTracing(tracing =>
        {
            tracing.AddAspNetCoreInstrumentation()
                   .AddHttpClientInstrumentation();

            if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                tracing.AddOtlpExporter(opts => opts.Endpoint = new Uri(otlpEndpoint));
        });

    // ── Application + Infrastructure (DI centralizada por capa) ──────────────
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    // ── API Versioning — versión configurable desde appsettings ──────────────
    // Los controllers usan [ApiVersion(1.0)] y ruta "api/v{version:apiVersion}/...".
    // La versión por defecto se lee de ApiVersioning:DefaultMajorVersion y
    // ApiVersioning:DefaultMinorVersion.
    var apiVersionConfig = builder.Configuration.GetSection("ApiVersioning");
    var defaultMajor      = int.TryParse(apiVersionConfig["DefaultMajorVersion"], out var maj) ? maj : 1;
    var defaultMinor      = int.TryParse(apiVersionConfig["DefaultMinorVersion"], out var min) ? min : 0;

    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion              = new ApiVersion(defaultMajor, defaultMinor);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions              = true;
        options.ApiVersionReader               = new UrlSegmentApiVersionReader();
    }).AddMvc()
      .AddApiExplorer(options =>
      {
          options.GroupNameFormat           = "'v'VVV";
          options.SubstituteApiVersionInUrl = true;
      });

    // ── Auth JWT (OPCIONAL) ──────────────────────────────────────────────────
    // Si "JwtSettings:Secret" está vacío, la app arranca igual: /health y endpoints
    // públicos funcionan, pero /login no puede generar tokens y los endpoints [Authorize]
    // rechazan requests. Configura el Secret para habilitar la autenticación.
    var jwtSettings = builder.Configuration.GetSection("JwtSettings");
    var secret      = jwtSettings["Secret"];

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            if (string.IsNullOrWhiteSpace(secret))
                return;

            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidateAudience         = true,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer              = jwtSettings["Issuer"],
                ValidAudience            = jwtSettings["Audience"],
                IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
            };
        });

    builder.Services.AddAuthorization();

    // ─────────────────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── OpenAPI + Scalar UI ───────────────────────────────────────────────────
    // UI disponible en: http://localhost:5000/scalar/v1
    // Flujo de autenticación en Scalar:
    //   1. Llama POST /api/auth/login desde Scalar y copia el accessToken.
    //   2. Haz clic en el ícono 🔒 (esquina superior derecha) y pega el token.
    //   3. Scalar agrega "Authorization: Bearer <token>" en todos los requests.
    app.MapOpenApi();
    app.MapScalarApiReference(options => options
        .WithTitle(serviceName)
        .AddPreferredSecuritySchemes("BearerAuth")
        .AddHttpAuthentication("BearerAuth", auth => { auth.Token = ""; }));

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "v1");
        options.RoutePrefix = string.Empty;
    });

    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler("/error");
        app.UseHsts();
    }

    app.UseHttpsRedirection();

    // ── Middleware de seguridad HTTP (headers) ────────────────────────────────
    app.UseMiddleware<SecurityHeadersMiddleware>();

    // ── Manejo global de excepciones (respuesta JSON estructurada) ───────────
    app.UseMiddleware<GlobalExceptionMiddleware>();

    // ── API Key (OPT-IN: solo valida si "Security:ApiKey" está configurada) ──
    app.UseMiddleware<ApiKeyMiddleware>();

    // ── Log Enrichment: CorrelationId + UserId en cada request ───────────────
    app.UseMiddleware<LogEnrichmentMiddleware>();

    // ── Serilog Request Logging con campos http{} estructurados ──────────────
    // Inyecta Http.method, Http.path, Http.statusCode y Http.durationMs
    // como propiedades Serilog que WinServicesApiJsonFormatter agrupa en http{}.
    app.UseSerilogRequestLogging(options =>
    {
        options.EnrichDiagnosticContext = (diag, http) =>
        {
            diag.Set("Http.method", http.Request.Method);
            diag.Set("Http.path",   http.Request.Path.Value);
        };
        options.MessageTemplate = "HTTP {Http.method} {Http.path} → {StatusCode} en {Elapsed:0}ms";
    });

    app.UseAuthentication();
    app.UseAuthorization();

    // ── Health Check — GET /health (público, sin auth) ────────────────────────
    app.MapHealthCheckEndpoints();

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "La aplicación terminó inesperadamente");
}
finally
{
    Log.CloseAndFlush();
}
