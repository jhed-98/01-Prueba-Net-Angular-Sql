using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using StackExchange.Redis;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Infrastructure.Authentication;
using WinServices.Api.Infrastructure.Cache;
using WinServices.Api.Infrastructure.Data;
using WinServices.Api.Infrastructure.HealthChecks;
using WinServices.Api.Infrastructure.Http;
using WinServices.Api.Infrastructure.Messaging;
using WinServices.Api.Infrastructure.Repositories;
using WinServices.Api.Infrastructure.Resilience;

namespace WinServices.Api.Infrastructure;

/// <summary>
/// Registro de dependencias de la capa Infrastructure.
/// Llamar desde Program.cs: builder.Services.AddInfrastructure(builder.Configuration)
///
/// Todos los servicios externos (BD, Redis, RabbitMQ) son OPCIONALES: se registran solo
/// cuando su clave de configuración está presente. Si falta, la app arranca igual y /health
/// simplemente reporta menos checks.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Base de datos (SQL Server + Dapper) ──────────────────────────────
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = "Server=localhost;Database=PE_WINET_CRM;Trusted_Connection=True;TrustServerCertificate=True;";
        }

        services.AddSingleton<IDbConnectionFactory>(
            _ => new DbConnectionFactory(connectionString));
        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: ["db"]);

        // ── Repositorios ──────────────────────────────────────────────────────
        // Registra aquí tus repositorios (Interfaz en Application -> Implementación en Infrastructure)
        services.AddScoped<IExampleRepository, ExampleRepository>();

        // ── Auth ──────────────────────────────────────────────────────────────
        services.AddScoped<IJwtProvider, JwtProvider>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();

        // ── Health Checks (base) ──────────────────────────────────────────────
        // Los checks de dependencias se agregan junto con cada feature (BD/Redis/RabbitMQ).
        services.AddHealthChecks();

        // ── Redis (caché distribuido) — OPCIONAL ──────────────────────────────
        // Se activa solo si "Redis:ConnectionString" tiene valor. AbortOnConnectFail=false
        // evita que el arranque falle si Redis no está disponible temporalmente.
        var redisConn = configuration["Redis:ConnectionString"];
        if (!string.IsNullOrWhiteSpace(redisConn))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
            {
                var config = ConfigurationOptions.Parse(redisConn);
                config.AbortOnConnectFail = false;
                return ConnectionMultiplexer.Connect(config);
            });
            services.AddSingleton<ICacheService, RedisCacheService>();
            services.AddHealthChecks().AddCheck<RedisHealthCheck>("redis", tags: ["cache"]);
        }

        // ── RabbitMQ (mensajería) — OPCIONAL ──────────────────────────────────
        // Se activa solo si "RabbitMQ:Host" tiene valor. Si no, se registra NoOpMessageBus
        // para que el código dependa de IMessageBus sin que RabbitMQ exista.
        var rabbitHost = configuration["RabbitMQ:Host"];
        if (!string.IsNullOrWhiteSpace(rabbitHost))
        {
            var factory = new ConnectionFactory
            {
                HostName    = rabbitHost,
                Port        = int.TryParse(configuration["RabbitMQ:Port"], out var p) ? p : 5672,
                UserName    = configuration["RabbitMQ:Username"]    ?? "guest",
                Password    = configuration["RabbitMQ:Password"]    ?? "guest",
                VirtualHost = configuration["RabbitMQ:VirtualHost"] ?? "/"
            };

            // ConnectionFactory es Singleton; la conexión real se crea de forma perezosa
            // (lazy) en la primera publicación, de modo que el arranque no depende de que
            // el broker esté levantado. El bus es Scoped (un canal por request).
            services.AddSingleton(factory);
            services.AddScoped<IMessageBus, RabbitMqMessageBus>();
            services.AddHealthChecks().AddCheck<RabbitMqHealthCheck>("rabbitmq", tags: ["messaging"]);

            // TODO: Para registrar consumidores en background:
            // services.AddHostedService<MiConsumidor>();
        }
        else
        {
            services.AddScoped<IMessageBus, NoOpMessageBus>();
        }

        // ── Clientes HTTP externos (RestSharp) — OPCIONAL ─────────────────────
        // TODO: Descomenta y adapta para cada API externa que necesites consumir.
        // IMPORTANTE: registra cada cliente SOLO si su URL está configurada, y en los
        // servicios usa GetService<> + null-check (no GetRequiredService) para no
        // romper el arranque cuando la API externa no está presente.
        // Ver README sección "Consumo de APIs externas con RestSharp".
        //
        // Ejemplo funcional: consume la API pública JSONPlaceholder (sin API key).
        // Si "ExternalServices:ExampleApi:BaseUrl" está vacío, usa el default público.
        var exampleApiUrl = configuration["ExternalServices:ExampleApi:BaseUrl"]
            ?? "https://jsonplaceholder.typicode.com";
        services.AddScoped(_ => new ExampleHttpService(exampleApiUrl, PipelineFactory.Create()));

        return services;
    }
}
