using Serilog.Context;
using System.Security.Claims;

namespace WinServices.Api.Api.Middleware;

/// <summary>
/// Inyecta CorrelationId y UserId en el LogContext de Serilog para cada request.
///
/// CorrelationId: toma el header "X-Correlation-Id" o genera uno nuevo (GUID corto).
///                Lo devuelve en la respuesta como "X-Correlation-Id".
/// UserId:        extrae el claim "sub" o NameIdentifier del JWT autenticado.
/// </summary>
public sealed class LogEnrichmentMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        // Alinea el CorrelationId con el TraceId de OpenTelemetry si existe.
        // Si no hay TraceId activo, intenta tomar el header o genera uno nuevo.
        var correlationId = System.Diagnostics.Activity.Current?.TraceId.ToString();

        if (string.IsNullOrEmpty(correlationId) || correlationId == "00000000000000000000000000000000")
        {
            correlationId = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                            ?? Guid.NewGuid().ToString("N")[..12];
        }

        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? ctx.User.FindFirstValue("sub");

        ctx.Response.Headers["X-Correlation-Id"] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        using (LogContext.PushProperty("UserId", userId))
        {
            await next(ctx);
        }
    }
}
