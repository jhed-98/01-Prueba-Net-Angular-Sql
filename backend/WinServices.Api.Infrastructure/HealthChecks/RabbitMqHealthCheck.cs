using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;

namespace WinServices.Api.Infrastructure.HealthChecks;

/// <summary>
/// Verifica conectividad con RabbitMQ intentando abrir una conexión.
/// Se registra solo cuando RabbitMQ está configurado.
/// Usa ConnectionFactory (no una conexión eager) para no depender del estado del broker
/// en el momento del arranque — el health check abre/cierra su propia conexión de prueba.
/// </summary>
public sealed class RabbitMqHealthCheck : IHealthCheck
{
    private readonly ConnectionFactory _factory;

    public RabbitMqHealthCheck(ConnectionFactory factory) => _factory = factory;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = await _factory.CreateConnectionAsync(cancellationToken);
            return connection.IsOpen
                ? HealthCheckResult.Healthy($"RabbitMQ disponible en {_factory.HostName}:{_factory.Port}.")
                : HealthCheckResult.Unhealthy("RabbitMQ no disponible. Conexión cerrada.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy($"RabbitMQ no disponible en {_factory.HostName}:{_factory.Port}.", ex);
        }
    }
}
