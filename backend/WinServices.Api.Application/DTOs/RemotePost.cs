using System.Text.Json.Serialization;

namespace WinServices.Api.Application.DTOs;

/// <summary>
/// Post de la API pública JSONPlaceholder (https://jsonplaceholder.typicode.com).
/// Usado como ejemplo de consumo de una API externa con RestSharp + Polly.
/// </summary>
public sealed record RemotePost(
    [property: JsonPropertyName("id")]    int Id,
    [property: JsonPropertyName("userId")] int UserId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("body")]  string Body);
