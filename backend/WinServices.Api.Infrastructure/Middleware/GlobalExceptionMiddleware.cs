using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace WinServices.Api.Infrastructure.Middleware;

/// <summary>
/// Middleware global que captura excepciones no manejadas y retorna una respuesta
/// JSON estructurada con código de error, HTTP status y sistema origen.
/// </summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no manejado en {Method} {Path}",
                context.Request.Method, context.Request.Path);

            var (statusCode, code, message) = ClasificarExcepcion(ex);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = statusCode;

            await context.Response.WriteAsJsonAsync(new
            {
                ok = false,
                error = new
                {
                    code,
                    http_status = statusCode,
                    message,
                    sistema_origen = ObtenerSistemaOrigen(ex)
                },
                traceId = context.TraceIdentifier
            });
        }
    }

    private static Exception Unwrap(Exception ex)
        => ex is AggregateException agg
            ? agg.InnerExceptions.FirstOrDefault() ?? ex
            : ex;

    private static (int StatusCode, string Code, string Message) ClasificarExcepcion(Exception ex)
    {
        var inner = Unwrap(ex);

        return inner switch
        {
            // Reglas de negocio lanzadas con RAISERROR o THROW en SQL Server (Number >= 50000)
            SqlException sqlEx when sqlEx.Number >= 50000 =>
                (400, "REGLA_NEGOCIO_SQL", sqlEx.Message),

            SqlException sqlEx when sqlEx.Message.Contains("Timeout", StringComparison.OrdinalIgnoreCase) =>
                (503, "BD_TIMEOUT", $"La base de datos SQL Server no respondió en el tiempo esperado. Detalle: {sqlEx.Message}"),

            SqlException sqlEx =>
                (503, "BD_ERROR", $"Error de base de datos SQL Server: {sqlEx.Message}"),

            TaskCanceledException or OperationCanceledException =>
                (504, "TIMEOUT", "La operación fue cancelada por timeout."),

            KeyNotFoundException =>
                (404, "NO_ENCONTRADO", "Recurso no encontrado."),

            UnauthorizedAccessException =>
                (401, "SIN_AUTORIZACION", "Sin autorización."),

            ArgumentException =>
                (400, "ARGUMENTO_INVALIDO", inner.Message),

            _ =>
                (500, "INTERNAL_ERROR", "Error interno del servidor.")
        };
    }

    private static string ObtenerSistemaOrigen(Exception ex)
    {
        var inner = Unwrap(ex);

        return inner switch
        {
            SqlException => "SQL Server",
            _ => "Backend"
        };
    }
}
