using Polly;
using RestSharp;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Infrastructure.Http;

/// <summary>
/// Base para clientes HTTP que consumen APIs externas.
/// Sigue el mismo patrón que BaseRepository: hereda para crear un cliente concreto.
/// Acepta un <see cref="ResiliencePipeline"/> opcional (Polly) para circuit breaker y retry.
///
/// Sin resiliencia (default):
///   public FacturacionHttpService(string baseUrl) : base(baseUrl) { }
///
/// Con circuit breaker (inyectado desde DI):
///   public FacturacionHttpService(string baseUrl, ResiliencePipeline pipeline)
///       : base(baseUrl, pipeline) { }
/// </summary>
public abstract class HttpServiceBase : IHttpService
{
    private readonly RestClient _client;
    private readonly ResiliencePipeline _pipeline;

    protected HttpServiceBase(string baseUrl, ResiliencePipeline? pipeline = null)
    {
        _client   = new RestClient(baseUrl);
        _pipeline = pipeline ?? ResiliencePipeline.Empty;
    }

    protected HttpServiceBase(RestClientOptions options, ResiliencePipeline? pipeline = null)
    {
        _client   = new RestClient(options);
        _pipeline = pipeline ?? ResiliencePipeline.Empty;
    }

    public async Task<T?> GetAsync<T>(string resource, CancellationToken ct = default) where T : class
    {
        var request = new RestRequest(resource);
        return await _pipeline.ExecuteAsync(
            async token => await _client.GetAsync<T>(request, token), ct);
    }

    public async Task<TRes?> PostAsync<TReq, TRes>(string resource, TReq body, CancellationToken ct = default)
        where TReq : class where TRes : class
    {
        var request = new RestRequest(resource).AddJsonBody(body);
        return await _pipeline.ExecuteAsync(
            async token => await _client.PostAsync<TRes>(request, token), ct);
    }

    public async Task<TRes?> PutAsync<TReq, TRes>(string resource, TReq body, CancellationToken ct = default)
        where TReq : class where TRes : class
    {
        var request = new RestRequest(resource).AddJsonBody(body);
        return await _pipeline.ExecuteAsync(
            async token => await _client.PutAsync<TRes>(request, token), ct);
    }

    public async Task DeleteAsync(string resource, CancellationToken ct = default)
    {
        var request = new RestRequest(resource);
        await _pipeline.ExecuteAsync(
            async token => { await _client.DeleteAsync(request, token); return 0; }, ct);
    }

    /// <summary>
    /// Agrega un header fijo a todos los requests (API keys, tokens de servicio estáticos).
    /// Para Bearer tokens dinámicos (por usuario), pásalo en cada request con AddHeader().
    /// </summary>
    protected void AddDefaultHeader(string name, string value) =>
        _client.AddDefaultHeader(name, value);

    /// <summary>
    /// Configura autenticación Bearer para todos los requests del cliente.
    /// Llama desde el constructor del servicio concreto cuando el token es fijo.
    /// </summary>
    protected void SetBearerToken(string token) =>
        _client.AddDefaultHeader("Authorization", $"Bearer {token}");
}
