namespace WinServices.Api.Application.Interfaces;

/// <summary>
/// Contrato para consumir APIs HTTP externas.
/// Implementado en Infrastructure con RestSharp.
/// </summary>
public interface IHttpService
{
    Task<T?> GetAsync<T>(string resource, CancellationToken ct = default) where T : class;
    Task<TRes?> PostAsync<TReq, TRes>(string resource, TReq body, CancellationToken ct = default)
        where TReq : class where TRes : class;
    Task<TRes?> PutAsync<TReq, TRes>(string resource, TReq body, CancellationToken ct = default)
        where TReq : class where TRes : class;
    Task DeleteAsync(string resource, CancellationToken ct = default);
}
