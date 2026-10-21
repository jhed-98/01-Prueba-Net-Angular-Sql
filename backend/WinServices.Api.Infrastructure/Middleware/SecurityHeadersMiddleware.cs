using Microsoft.AspNetCore.Http;

namespace WinServices.Api.Infrastructure.Middleware;

/// <summary>
/// Agrega headers de seguridad HTTP a todas las respuestas.
/// - X-Content-Type-Options: nosniff
/// - X-Frame-Options: DENY
/// - X-XSS-Protection: 1; mode=block
/// - Referrer-Policy: strict-origin-when-cross-origin
/// - Content-Security-Policy: estricta para API, relajada para /scalar y /openapi
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["X-XSS-Protection"] = "1; mode=block";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] = "geolocation=(), microphone=()";

            if (context.Request.Path.StartsWithSegments("/scalar") ||
                context.Request.Path.StartsWithSegments("/openapi"))
            {
                headers["Content-Security-Policy"] =
                    "default-src 'self'; " +
                    "img-src 'self' data: https://cdn.jsdelivr.net; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "connect-src 'self'; " +
                    "font-src 'self' https://fonts.gstatic.com;";
            }
            else
            {
                headers["Content-Security-Policy"] =
                    "default-src 'self'; " +
                    "img-src 'self' data:; " +
                    "script-src 'self'; " +
                    "style-src 'self' 'unsafe-inline'";
            }

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
