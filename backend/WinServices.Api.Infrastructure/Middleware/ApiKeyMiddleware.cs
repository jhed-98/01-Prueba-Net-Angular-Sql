using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace WinServices.Api.Infrastructure.Middleware;

/// <summary>
/// Middleware que valida el header X-Api-Key para comunicación segura entre servicios internos.
/// OPT-IN: si "Security:ApiKey" está vacía, la validación se omite y la app funciona sin API key.
/// Se saltea rutas de health check y documentación.
/// </summary>
public sealed class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private readonly ILogger<ApiKeyMiddleware> _logger;

    private static readonly string[] RutasSalteadas = { "/health", "/scalar", "/openapi" };

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<ApiKeyMiddleware> logger)
    {
        _next   = next;
        _apiKey = configuration["Security:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        if (RutasSalteadas.Any(ruta => path.StartsWith(ruta, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("ApiKey no configurada. Permitiendo request sin validación.");
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-Api-Key", out var extractedApiKey)
            || !StringValues.Equals(_apiKey, extractedApiKey))
        {
            _logger.LogWarning("Acceso denegado: ApiKey inválida o faltante. Path: {Path}", path);
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                "{\"ok\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"http_status\":401,\"message\":\"X-Api-Key es obligatoria.\",\"sistema_origen\":\"API Gateway\"}}");
            return;
        }

        await _next(context);
    }
}
