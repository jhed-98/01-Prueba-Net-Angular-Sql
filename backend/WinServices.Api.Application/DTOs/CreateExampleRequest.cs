namespace WinServices.Api.Application.DTOs;

public sealed record CreateExampleRequest(
    string Name,
    string? Description
);
