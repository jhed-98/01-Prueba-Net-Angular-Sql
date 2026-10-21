namespace WinServices.Api.Application.DTOs;

public sealed record ExampleDto(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
