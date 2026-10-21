namespace WinServices.Api.Application.Interfaces;

/// <summary>
/// Contrato de caché. La implementación concreta (Redis) vive en Infrastructure.
/// Inyecta esta interfaz en los servicios que necesiten caché — nunca StackExchange.Redis directamente.
/// </summary>
public interface ICacheService
{
    /// <summary>Obtiene un valor del caché. Retorna null si no existe o expiró.</summary>
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;

    /// <summary>Guarda un valor en el caché con tiempo de expiración opcional (default: 10 min).</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) where T : class;

    /// <summary>Elimina una entrada del caché (útil al actualizar o eliminar la entidad).</summary>
    Task RemoveAsync(string key, CancellationToken ct = default);

    /// <summary>
    /// Patrón Cache-Aside: devuelve el valor cacheado si existe; si no, ejecuta <paramref name="factory"/>,
    /// guarda el resultado y lo retorna. Evita escribir el patrón if/get/set manualmente en cada servicio.
    /// </summary>
    Task<T?> GetOrSetAsync<T>(
        string key,
        Func<Task<T?>> factory,
        TimeSpan? expiry = null,
        CancellationToken ct = default) where T : class;
}
