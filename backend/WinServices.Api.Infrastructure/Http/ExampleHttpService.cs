using Polly;
using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Infrastructure.Http;

/// <summary>
/// Ejemplo de cliente HTTP para una API externa (JSONPlaceholder, público y sin API key).
/// Demuestra el uso de <see cref="HttpServiceBase"/> + RestSharp + resiliencia Polly.
///
/// Registrar en DI:
///   var url = configuration["ExternalServices:ExampleApi:BaseUrl"]
///       ?? "https://jsonplaceholder.typicode.com";
///   services.AddScoped(_ => new ExampleHttpService(url, PipelineFactory.Create()));
///
/// TODO: Reemplaza con el servicio HTTP real que necesites consumir.
/// </summary>
public sealed class ExampleHttpService : HttpServiceBase
{
    public ExampleHttpService(string baseUrl, ResiliencePipeline? pipeline = null)
        : base(baseUrl, pipeline)
    {
    }

    /// <summary>
    /// Obtiene los posts públicos de JSONPlaceholder.
    /// GET https://jsonplaceholder.typicode.com/posts
    /// </summary>
    public async Task<List<RemotePost>?> GetPostsAsync(CancellationToken ct = default)
        => await GetAsync<List<RemotePost>>("posts", ct);

    // Ejemplo con API key como header fijo:
    // public ExampleHttpService(string baseUrl, string apiKey, ResiliencePipeline? pipeline = null)
    //     : base(baseUrl, pipeline)
    // {
    //     AddDefaultHeader("X-Api-Key", apiKey);
    // }

    // Ejemplo con Bearer token fijo (token de servicio, no de usuario):
    // public ExampleHttpService(string baseUrl, string token, ResiliencePipeline? pipeline = null)
    //     : base(baseUrl, pipeline)
    // {
    //     SetBearerToken(token);
    // }
}
