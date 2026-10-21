using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Infrastructure.Cache;

/// <summary>
/// Implementación de <see cref="ICacheService"/> sobre Redis usando StackExchange.Redis.
/// Serializa/deserializa los valores como JSON con System.Text.Json.
/// Registrar como Singleton: la conexión Redis es thread-safe y costosa de crear.
/// </summary>
public sealed class RedisCacheService : ICacheService
{
    private readonly IDatabase _db;
    private readonly ILogger<RedisCacheService> _logger;
    private static readonly TimeSpan DefaultExpiry = TimeSpan.FromMinutes(10);

    public RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger)
    {
        _db     = redis.GetDatabase();
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        var value = await _db.StringGetAsync(key);
        if (value.IsNullOrEmpty)
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>((string)value!);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
        where T : class
    {
        var json       = JsonSerializer.Serialize(value);
        var expiration = expiry ?? DefaultExpiry;
        await _db.StringSetAsync(key, json, expiration);
        _logger.LogDebug("Cache SET {Key} (TTL: {Expiry})", key, expiration);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        await _db.KeyDeleteAsync(key);
        _logger.LogDebug("Cache DEL {Key}", key);
    }

    public async Task<T?> GetOrSetAsync<T>(
        string key,
        Func<Task<T?>> factory,
        TimeSpan? expiry = null,
        CancellationToken ct = default) where T : class
    {
        var cached = await GetAsync<T>(key, ct);
        if (cached is not null)
        {
            _logger.LogDebug("Cache HIT {Key}", key);
            return cached;
        }

        _logger.LogDebug("Cache MISS {Key} — consultando fuente de datos", key);
        var value = await factory();
        if (value is not null)
        {
            await SetAsync(key, value, expiry, ct);
        }

        return value;
    }
}
