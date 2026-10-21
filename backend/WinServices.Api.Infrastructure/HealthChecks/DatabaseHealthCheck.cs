using Dapper;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WinServices.Api.Infrastructure.Data;

namespace WinServices.Api.Infrastructure.HealthChecks;

/// <summary>
/// Verifica conectividad con la base de datos ejecutando "SELECT 1".
/// Se registra automáticamente en AddInfrastructure() — siempre activo.
/// </summary>
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly IDbConnectionFactory _factory;

    public DatabaseHealthCheck(IDbConnectionFactory factory) => _factory = factory;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var conn = _factory.CreateConnection();
            await conn.ExecuteScalarAsync<int>("SELECT 1");
            return HealthCheckResult.Healthy("Base de datos disponible.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Base de datos no disponible.", ex);
        }
    }
}
