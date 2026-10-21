using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace WinServices.Api.Infrastructure.HealthChecks;

/// <summary>
/// Verifica conectividad con Redis ejecutando un PING.
/// Registrar en AddInfrastructure() solo cuando Redis esté activo —
/// depende de IConnectionMultiplexer que solo se registra si Redis está configurado.
/// </summary>
public sealed class RedisHealthCheck : IHealthCheck
{
    private readonly IConnectionMultiplexer _redis;

    public RedisHealthCheck(IConnectionMultiplexer redis) => _redis = redis;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var db      = _redis.GetDatabase();
            var latency = await db.PingAsync();
            return HealthCheckResult.Healthy($"Redis disponible. Latencia: {latency.TotalMilliseconds:F1}ms");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis no disponible.", ex);
        }
    }
}
