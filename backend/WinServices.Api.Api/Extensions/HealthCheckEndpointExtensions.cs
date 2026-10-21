using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace WinServices.Api.Api.Extensions;

public static class HealthCheckEndpointExtensions
{
    /// <summary>
    /// Registra el endpoint GET /health como público.
    /// Configurar los checks en Infrastructure/DependencyInjection.cs.
    /// </summary>
    public static WebApplication MapHealthCheckEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            AllowCachingResponses = false,
            ResponseWriter        = WriteJsonResponse
        }).AllowAnonymous();

        return app;
    }

    private static async Task WriteJsonResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(new
        {
            status   = report.Status.ToString(),
            duration = Math.Round(report.TotalDuration.TotalMilliseconds, 2),
            checks   = report.Entries.Select(e => new
            {
                name        = e.Key,
                status      = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration    = Math.Round(e.Value.Duration.TotalMilliseconds, 2),
                tags        = e.Value.Tags
            })
        });
    }
}
