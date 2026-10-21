---
name: cache-messaging
description: Patrones de caché distribuido con Redis (ICacheService, Cache-Aside) y mensajería asíncrona con RabbitMQ (IMessageBus, consumidores) en la plantilla win-services-api.
---

# Caché y Mensajería

## Redis — Caché distribuido

### Activar

1. `appsettings.Development.json`:
```json
"Redis": {
  "ConnectionString": "localhost:6379"
}
```

2. Descomentar el bloque Redis en `Infrastructure/DependencyInjection.cs`:
```csharp
// Agregar usings: using StackExchange.Redis; using WinServices.Api.Infrastructure.Cache;
var redisConn = configuration["Redis:ConnectionString"];
if (!string.IsNullOrEmpty(redisConn))
{
    services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
    services.AddSingleton<ICacheService, RedisCacheService>();
}
```

> `IConnectionMultiplexer` se registra como **Singleton**: es thread-safe y costoso de crear.
> `ICacheService` también Singleton porque depende del multiplexer.

### Patrón Cache-Aside (GetOrSetAsync)

El método más usado: verifica caché → si miss, consulta BD → guarda en caché → retorna.

```csharp
public sealed class TecnicoService : ITecnicoService
{
    private readonly ITecnicoRepository _repo;
    private readonly ICacheService _cache;

    public async Task<TecnicoDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _cache.GetOrSetAsync<TecnicoDto>(
            key:     $"tecnico:{id}",
            factory: async () => (await _repo.GetByIdAsync(id, ct))?.ToDto(),
            expiry:  TimeSpan.FromMinutes(30),
            ct:      ct);
    }

    public async Task<Result<TecnicoDto>> UpdateAsync(int id, ..., CancellationToken ct = default)
    {
        // ... actualizar en BD ...

        // Invalidar caché para que el próximo Get consulte la BD
        await _cache.RemoveAsync($"tecnico:{id}", ct);
        return Result<TecnicoDto>.Success(updated);
    }
}
```

### Métodos de ICacheService

| Método | Descripción |
|---|---|
| `GetAsync<T>(key)` | Obtiene del caché; null si no existe o expiró |
| `SetAsync<T>(key, value, expiry?)` | Guarda en caché (default: 10 min) |
| `RemoveAsync(key)` | Elimina una entrada (invalidación al actualizar/eliminar) |
| `GetOrSetAsync<T>(key, factory, expiry?)` | Cache-Aside completo en una sola llamada |

### Convenciones de naming de claves

```
tecnico:{id}                  → entidad individual
tecnicos:all                  → colección completa
tecnicos:empresa:{empresaId}  → filtro compuesto
v1:tecnico:{id}               → con versión (útil para invalidación masiva)
```

### Configuración en producción (variable de entorno)

```bash
Redis__ConnectionString=redis.servidor.com:6379,password=secret,ssl=true
```

---

## RabbitMQ — Mensajería asíncrona

### Activar

1. `appsettings.Development.json` (si difiere de los defaults en `appsettings.json`):
```json
"RabbitMQ": {
  "Host":        "localhost",
  "Port":        "5672",
  "Username":    "guest",
  "Password":    "guest",
  "VirtualHost": "/"
}
```

2. Descomentar el bloque RabbitMQ en `Infrastructure/DependencyInjection.cs`:
```csharp
// Agregar usings: using RabbitMQ.Client; using WinServices.Api.Infrastructure.Messaging;
var rabbitFactory = new ConnectionFactory
{
    HostName    = configuration["RabbitMQ:Host"]        ?? "localhost",
    Port        = int.Parse(configuration["RabbitMQ:Port"] ?? "5672"),
    UserName    = configuration["RabbitMQ:Username"]    ?? "guest",
    Password    = configuration["RabbitMQ:Password"]    ?? "guest",
    VirtualHost = configuration["RabbitMQ:VirtualHost"] ?? "/"
};
// Singleton: una sola conexión TCP reutilizada
services.AddSingleton<IConnection>(
    _ => rabbitFactory.CreateConnectionAsync().GetAwaiter().GetResult());
// Scoped: un canal por request
services.AddScoped<IMessageBus, RabbitMqMessageBus>();
```

### Publicar un mensaje

Inyecta `IMessageBus` en el servicio de aplicación que necesite publicar eventos:

```csharp
public sealed class InstalacionService : IInstalacionService
{
    private readonly IInstalacionRepository _repo;
    private readonly IMessageBus _bus;

    public async Task<Result> CompletarAsync(int id, CancellationToken ct = default)
    {
        await _repo.MarcarCompletadaAsync(id, ct);

        await _bus.PublishAsync(
            exchange:   "",                    // default exchange (vacío)
            routingKey: "activaciones",        // = nombre de la cola en default exchange
            message:    new ActivacionEvent(id, DateTime.UtcNow),
            ct:         ct);

        return Result.Success();
    }
}

public sealed record ActivacionEvent(int InstalacionId, DateTime FechaEvento);
```

### Crear un consumidor

Hereda `RabbitMqConsumerBase` (BackgroundService). Define `QueueName` y sobreescribe `HandleAsync`:

```csharp
// Infrastructure/Messaging/ActivacionConsumer.cs
public sealed class ActivacionConsumer : RabbitMqConsumerBase
{
    private readonly IServiceScopeFactory _scopeFactory;

    public ActivacionConsumer(
        IConnection connection,
        ILogger<ActivacionConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(connection, logger)
    {
        _scopeFactory = scopeFactory;
    }

    protected override string QueueName => "activaciones";

    protected override async Task HandleAsync(string message, CancellationToken ct)
    {
        var evento = JsonSerializer.Deserialize<ActivacionEvent>(message)!;

        // Crea un scope para inyectar servicios Scoped dentro del Singleton (hosted service)
        await using var scope = _scopeFactory.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IActivacionService>();
        await service.ProcesarAsync(evento.InstalacionId, ct);
    }
}
```

### Registrar el consumidor

```csharp
// Program.cs
builder.Services.AddHostedService<ActivacionConsumer>();
```

### Configurar dead-letter queue (opcional)

Sobreescribe `ConfigureQueueAsync` en el consumidor:

```csharp
protected override async Task ConfigureQueueAsync(IChannel channel, CancellationToken ct)
{
    await channel.QueueDeclareAsync(
        queue:     QueueName,
        durable:   true,
        exclusive: false,
        autoDelete: false,
        arguments: new Dictionary<string, object?>
        {
            ["x-dead-letter-exchange"]    = "",
            ["x-dead-letter-routing-key"] = $"{QueueName}.dlq"
        },
        cancellationToken: ct);
}
```

### Comportamiento de ACK/NACK

| Caso | Resultado |
|---|---|
| `HandleAsync` completa sin excepción | ACK — mensaje eliminado de la cola |
| `HandleAsync` lanza excepción | NACK sin requeue → va a dead-letter queue (si está configurada) |
| Proceso muere antes del ACK | RabbitMQ reencola el mensaje automáticamente |

### Configuración en producción

```bash
RabbitMQ__Host=rabbitmq.servidor.com
RabbitMQ__Username=app_user
RabbitMQ__Password=secret
```
