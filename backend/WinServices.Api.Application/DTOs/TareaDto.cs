namespace WinServices.Api.Application.DTOs;

public sealed record TareaDto(
    int Id,
    string Titulo,
    string? Descripcion,
    DateTime FechaInicio,
    DateTime? FechaFin,
    string Estado,
    int CategoriaId,
    string CategoriaNombre,
    DateTime FechaCreacion
);
