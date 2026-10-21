namespace WinServices.Api.Application.DTOs;

public sealed record UpdateExampleRequest(
    string Name,
    string? Description
);
