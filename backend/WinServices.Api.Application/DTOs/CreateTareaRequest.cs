namespace WinServices.Api.Application.DTOs;

public sealed record CreateTareaRequest(
    string Titulo,
    string? Descripcion,
    DateTime FechaInicio,
    DateTime? FechaFin,
    int CategoriaId,
    string? Estado
);
