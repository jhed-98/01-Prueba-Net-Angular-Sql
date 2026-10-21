---
name: logging-http
description: Patrones de logging con Serilog (formato JSON estándar WinServices.Api), consumo de APIs externas con RestSharp y resiliencia con Polly (circuit breaker + retry) en la plantilla win-services-api.
---

# Logging, Clientes HTTP y Resiliencia

## Formato estándar de log (WinServices.ApiJsonFormatter)

Cada log event se serializa como JSON con el siguiente shape:

```json
{
  "timestamp":    "2026-04-17T14:30:00.123Z",
  "level":        "ERROR",
  "service":      "win-crm-service",
  "version":      "1.2.0",
  "environment":  "production",
  "traceId":      "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId":       "00f067aa0ba902b7",
  "correlationId":"req-abc123",
  "userId":       "user-456",
  "message":      "Error al procesar descuento",
  "exception":    "NullReferenceException: Object reference...",
  "context": {
    "module":    "descuentos",
    "operation": "aplicar-descuento",
    "clienteId": "CLI-789"
  },
  "http": {
    "method":     "POST",
    "path":       "/api/descuentos",
    "statusCode": 500,
    "durationMs": 234
  }
}
```

### Origen de cada campo

| Campo | Origen |
|---|---|
| `timestamp`, `level`, `message`, `exception` | Serilog (automático) |
| `service`, `version`, `environment` | `Enrich.WithProperty` en `Program.cs` (lee de `appsettings.json`) |
| `traceId`, `spanId` | `Serilog.Enrichers.OpenTelemetry` — inyecta el Activity activo |
| `correlationId` | `LogEnrichmentMiddleware` — header `X-Correlation-Id` o GUID generado |
| `userId` | `LogEnrichmentMiddleware` — claim `sub` / `NameIdentifier` del JWT |
| `context{}` | Propiedad `{@Context}` destructurada en el log call |
| `http{}` | `UseSerilogRequestLogging` + `EnrichDiagnosticContext` en `Program.cs` |

---

## Serilog — Usar el logger en servicios

```csharp
public sealed class DescuentoService
{
    private readonly ILogger<DescuentoService> _logger;

    public DescuentoService(ILogger<DescuentoService> logger) => _logger = logger;

    public async Task<Result<decimal>> AplicarDescuentoAsync(string clienteId, CancellationToken ct)
    {
        // Log con context{} usando destructuring (@Context)
        _logger.LogInformation("Aplicando descuento {@Context}",
            new { module = "descuentos", operation = "aplicar-descuento", clienteId });

        try
        {
            // ... lógica de negocio ...

            _logger.LogInformation("Descuento aplicado {@Context}",
                new { module = "descuentos", operation = "aplicar-descuento", clienteId });

            return Result<decimal>.Success(10m);
        }
        catch (Exception ex)
        {
            // exception{} se captura automáticamente cuando se pasa ex como primer argumento
            _logger.LogError(ex, "Error al procesar descuento {@Context}",
                new { module = "descuentos", operation = "aplicar-descuento", clienteId });

            return Result<decimal>.Failure("Error al procesar el descuento.");
        }
    }
}
```

### Agregar context{} para todo un bloque de código

Cuando el contexto aplica a múltiples log calls dentro de un mismo método, usa `LogContext.PushProperty`:

```csharp
using Serilog.Context;

using (LogContext.PushProperty("Context.module",    "descuentos"))
using (LogContext.PushProperty("Context.operation", "aplicar-descuento"))
using (LogContext.PushProperty("Context.clienteId", clienteId))
{
    _logger.LogInformation("Iniciando proceso");
    // ... lógica ...
    _logger.LogInformation("Proceso completado");
    // Todos los logs dentro del bloque incluirán context{}
}
```

### Niveles de log (mapeados al formato estándar)

| Llamada en código | Campo `level` en JSON |
|---|---|
| `LogDebug` / `LogTrace` | `DEBUG` |
| `LogInformation` | `INFO` |
| `LogWarning` | `WARN` |
| `LogError` | `ERROR` |
| `LogCritical` | `FATAL` |

> Siempre usa **propiedades nombradas** `{NombrePropiedad}` — Serilog las captura como campos
> estructurados. Nunca concatenes strings: `"Procesando " + id` pierde la estructura.

### Niveles configurados en appsettings.json

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft": "Warning",
      "System": "Warning"
    }
  }
}
```

### Sinks configurados en la plantilla

| Sink | Destino | Formato |
|---|---|---|
| Console | Terminal | JSON estándar WinServices.Api |
| File | `logs/winservices.api-YYYYMMDD.log` (retención 7 días) | JSON estándar WinServices.Api |
| RabbitMQ | Exchange `logs_exchange` (fanout) — activo si `RabbitMQ:Host` está configurado | JSON estándar WinServices.Api |

---

## CorrelationId y UserId (automáticos vía middleware)

`LogEnrichmentMiddleware` se ejecuta en cada request e inyecta automáticamente:

- **`correlationId`**: toma el header `X-Correlation-Id` del request entrante o genera un GUID corto. Lo propaga en el header de la respuesta.
- **`userId`**: extrae el claim `sub` / `NameIdentifier` del JWT autenticado.

No necesitas hacer nada en los servicios — están disponibles en todos los logs del request.

Si necesitas propagar el `correlationId` a servicios externos:

```csharp
// Infrastructure/Http/MiApiHttpService.cs
public async Task<MiResponseDto?> GetDatoAsync(int id, string correlationId, CancellationToken ct = default)
{
    var request = new RestRequest($"recursos/{id}");
    request.AddHeader("X-Correlation-Id", correlationId);
    return await GetAsync<MiResponseDto>(request, ct);
}
```

---

## Configuración de servicio en appsettings.json

```json
"App": {
  "Version": "1.2.0"
},
"OpenTelemetry": {
  "ServiceName": "win-crm-service",
  "OtlpEndpoint": "http://jaeger:4317"
}
```

Los campos `service`, `version` y `environment` del log JSON se leen de aquí automáticamente.
El `environment` se toma de `IHostEnvironment.EnvironmentName` (development / staging / production).

---

## RestSharp — Clientes HTTP externos

### Crear cliente para API externa

```csharp
// Infrastructure/Http/MiApiHttpService.cs
public sealed class MiApiHttpService : HttpServiceBase
{
    // Sin resiliencia (default)
    public MiApiHttpService(string baseUrl) : base(baseUrl) { }

    // Con circuit breaker inyectado desde DI
    public MiApiHttpService(string baseUrl, ResiliencePipeline pipeline)
        : base(baseUrl, pipeline) { }

    public async Task<MiResponseDto?> GetDatoAsync(int id, CancellationToken ct = default)
        => await GetAsync<MiResponseDto>($"recursos/{id}", ct);

    public async Task<MiResponseDto?> CrearAsync(MiRequestDto request, CancellationToken ct = default)
        => await PostAsync<MiRequestDto, MiResponseDto>("recursos", request, ct);
}
```

### Autenticación con la API externa

```csharp
// API Key como header fijo
public MiApiHttpService(string baseUrl, string apiKey) : base(baseUrl)
    => AddDefaultHeader("X-Api-Key", apiKey);

// Bearer token fijo (token de servicio)
public MiApiHttpService(string baseUrl, string token) : base(baseUrl)
    => SetBearerToken(token);
```

### Registrar en Infrastructure/DependencyInjection.cs

```csharp
var url    = configuration["ExternalServices:MiApi:BaseUrl"]!;
var apiKey = configuration["ExternalServices:MiApi:ApiKey"]!;
services.AddScoped<MiApiHttpService>(_ => new MiApiHttpService(url, apiKey));
```

### Métodos disponibles en HttpServiceBase

| Método | HTTP | Descripción |
|---|---|---|
| `GetAsync<T>(resource)` | GET | Deserializa respuesta en T |
| `PostAsync<TReq, TRes>(resource, body)` | POST | Envía JSON, deserializa respuesta |
| `PutAsync<TReq, TRes>(resource, body)` | PUT | Actualiza recurso |
| `DeleteAsync(resource)` | DELETE | Sin respuesta |

---

## Polly — Circuit Breaker y Retry

`HttpServiceBase` acepta un `ResiliencePipeline?` opcional (Polly v8). Todos los métodos HTTP
pasan por el pipeline si se proporciona; si no, usan `ResiliencePipeline.Empty`.

### Construir un pipeline con retry + circuit breaker

```csharp
// Infrastructure/DependencyInjection.cs
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

var pipeline = new ResiliencePipelineBuilder()
    // Retry: 3 intentos, backoff exponencial 200ms → 400ms → 800ms
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        Delay            = TimeSpan.FromMilliseconds(200),
        BackoffType      = DelayBackoffType.Exponential
    })
    // Circuit breaker: abre si el 50% de las últimas llamadas fallan
    // Mínimo 5 llamadas en 30s antes de evaluar; permanece abierto 15s
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio      = 0.5,
        SamplingDuration  = TimeSpan.FromSeconds(30),
        MinimumThroughput = 5,
        BreakDuration     = TimeSpan.FromSeconds(15)
    })
    .Build();

services.AddScoped<MiApiHttpService>(_ => new MiApiHttpService(url, pipeline));
```

### Estados del circuit breaker

| Estado | Descripción |
|---|---|
| **Closed** | Normal — todas las llamadas pasan |
| **Open** | Fallas detectadas — rechaza llamadas sin intentarlas (`BrokenCircuitException`) |
| **Half-Open** | Prueba — deja pasar una llamada para verificar recuperación |

> El retry se ejecuta **antes** que el circuit breaker en el pipeline. Los reintentos cuentan
> como intentos dentro de la ventana de muestreo del circuit breaker.

### Manejar el circuito abierto en el servicio

```csharp
using Polly.CircuitBreaker;

public async Task<Result<MiDto>> ObtenerAsync(int id, CancellationToken ct = default)
{
    try
    {
        var dato = await _httpService.GetDatoAsync(id, ct);
        return dato is null
            ? Result<MiDto>.Failure("No encontrado.")
            : Result<MiDto>.Success(dato);
    }
    catch (BrokenCircuitException)
    {
        _logger.LogWarning("Servicio externo no disponible (circuit breaker abierto)");
        return Result<MiDto>.Failure("Servicio temporalmente no disponible. Intente más tarde.");
    }
}
```
