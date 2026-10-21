using System.Text.Json;
using Serilog.Events;
using Serilog.Formatting;

namespace WinServices.Api.Api.Logging;

/// <summary>
/// Formatea cada log event como un JSON con el shape estándar de la plataforma WinServices.Api.
/// Campos: timestamp, level, service, version, environment, traceId, spanId,
///         correlationId, userId, message, exception, context{}, http{}.
/// </summary>
public sealed class WinServicesApiJsonFormatter : ITextFormatter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented           = false,
        DefaultIgnoreCondition  = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public void Format(LogEvent logEvent, TextWriter output)
    {
        var doc = new Dictionary<string, object?>
        {
            ["@timestamp"]    = logEvent.Timestamp.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            ["level"]         = MapLevel(logEvent.Level),
            ["service"]       = Scalar(logEvent, "ServiceName"),
            ["version"]       = Scalar(logEvent, "ServiceVersion"),
            ["environment"]   = Scalar(logEvent, "EnvironmentName"),
            ["traceId"]       = Scalar(logEvent, "TraceId"),
            ["spanId"]        = Scalar(logEvent, "SpanId"),
            ["correlationId"] = Scalar(logEvent, "CorrelationId"),
            ["userId"]        = Scalar(logEvent, "UserId"),
            ["message"]       = logEvent.RenderMessage(),
            ["exception"]     = logEvent.Exception?.ToString(),
            ["context"]       = ExtractGroup(logEvent, "Context"),
            ["http"]          = ExtractHttp(logEvent),
        };

        output.WriteLine(JsonSerializer.Serialize(doc, JsonOptions));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string MapLevel(LogEventLevel level) => level switch
    {
        LogEventLevel.Verbose     => "DEBUG",
        LogEventLevel.Debug       => "DEBUG",
        LogEventLevel.Information => "INFO",
        LogEventLevel.Warning     => "WARN",
        LogEventLevel.Error       => "ERROR",
        LogEventLevel.Fatal       => "FATAL",
        _                         => level.ToString().ToUpperInvariant()
    };

    private static string? Scalar(LogEvent e, string key)
    {
        if (!e.Properties.TryGetValue(key, out var v)) return null;
        return v is ScalarValue sv ? sv.Value?.ToString() : v.ToString().Trim('"');
    }

    /// <summary>
    /// Extrae propiedades con prefijo "Prefix." (ej: "Context.module") o una propiedad
    /// destructurada {@Prefix} (ej: {@Context}) y las agrupa en un Dictionary.
    /// </summary>
    private static Dictionary<string, object?>? ExtractGroup(LogEvent e, string prefix)
    {
        var group = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        // Propiedad destructurada: _logger.LogError("msg {@Context}", new { module = "x" })
        if (e.Properties.TryGetValue(prefix, out var obj) && obj is StructureValue sv)
        {
            foreach (var prop in sv.Properties)
                group[prop.Name] = (prop.Value as ScalarValue)?.Value;
        }

        // Propiedades planas: LogContext.PushProperty("Context.module", "x")
        var dot = prefix + ".";
        foreach (var (key, val) in e.Properties)
        {
            if (key.StartsWith(dot, StringComparison.OrdinalIgnoreCase))
                group[key[dot.Length..]] = (val as ScalarValue)?.Value;
        }

        return group.Count > 0 ? group : null;
    }

    /// <summary>
    /// Construye el objeto http{} unificando las propiedades que inyecta
    /// UseSerilogRequestLogging (RequestMethod, RequestPath, StatusCode, Elapsed)
    /// y las que agrega LogEnrichmentMiddleware / enrichDiagnosticContext.
    /// </summary>
    private static Dictionary<string, object?>? ExtractHttp(LogEvent e)
    {
        var method     = Scalar(e, "Http.method")     ?? Scalar(e, "RequestMethod");
        var path       = Scalar(e, "Http.path")       ?? Scalar(e, "RequestPath");
        var statusCode = Scalar(e, "Http.statusCode") ?? Scalar(e, "StatusCode");
        var duration   = Scalar(e, "Http.durationMs") ?? Scalar(e, "Elapsed");

        if (method is null && path is null && statusCode is null && duration is null)
            return null;

        return new Dictionary<string, object?>
        {
            ["method"]     = method,
            ["path"]       = path,
            ["statusCode"] = statusCode is not null && int.TryParse(statusCode, out var sc) ? sc : null,
            ["durationMs"] = duration is not null && double.TryParse(duration,
                                 System.Globalization.NumberStyles.Any,
                                 System.Globalization.CultureInfo.InvariantCulture,
                                 out var ms)
                             ? (object?)Math.Round(ms) : null
        };
    }
}
