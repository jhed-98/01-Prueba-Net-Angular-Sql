using WinServices.Api.Application.DTOs;
using WinServices.Api.Domain.Entities;

namespace WinServices.Api.Application.Mapping;

/// <summary>
/// Métodos de extensión simples para mapear entre Entidades de Dominio y DTOs.
/// </summary>
public static class ExampleMapper
{
    public static ExampleDto ToDto(this Example example) => new(
        example.Id,
        example.Name,
        example.Description,
        example.CreatedAt,
        example.UpdatedAt
    );

    public static IEnumerable<ExampleDto> ToDtoList(this IEnumerable<Example> examples) =>
        examples.Select(e => e.ToDto());
}
