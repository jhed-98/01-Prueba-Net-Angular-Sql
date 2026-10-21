using FluentValidation;
using Microsoft.Extensions.Logging;
using WinServices.Api.Application.Common;
using WinServices.Api.Application.DTOs;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Application.Mapping;
using WinServices.Api.Domain.Entities;

namespace WinServices.Api.Application.Services;

/// <summary>
/// Servicio de aplicación de referencia: valida con FluentValidation, coordina con el
/// repositorio inyectado (IExampleRepository) y retorna Result&lt;T&gt;.
/// </summary>
public sealed class ExampleService : IExampleService
{
    private readonly IExampleRepository _repository;
    private readonly IValidator<CreateExampleRequest> _createValidator;
    private readonly IValidator<UpdateExampleRequest> _updateValidator;
    private readonly ILogger<ExampleService> _logger;

    public ExampleService(
        IExampleRepository repository,
        IValidator<CreateExampleRequest> createValidator,
        IValidator<UpdateExampleRequest> updateValidator,
        ILogger<ExampleService> logger)
    {
        _repository      = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _logger          = logger;
    }

    public async Task<IEnumerable<ExampleDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.ToDtoList();
    }

    public async Task<ExampleDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetByIdAsync(id, cancellationToken);
        return item?.ToDto();
    }

    public async Task<Result<ExampleDto>> CreateAsync(
        CreateExampleRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            _logger.LogWarning("Validación fallida al crear Example: {Errors}", errors);
            return Result<ExampleDto>.Failure(errors);
        }

        var entity = Example.Create(request.Name, request.Description);
        entity.Id = await _repository.CreateAsync(entity, cancellationToken);

        _logger.LogInformation("Example creado con ID {Id}", entity.Id);
        return Result<ExampleDto>.Success(entity.ToDto());
    }

    public async Task<Result<ExampleDto>> UpdateAsync(
        int id,
        UpdateExampleRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            return Result<ExampleDto>.Failure(errors);
        }

        var existing = await _repository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return Result<ExampleDto>.Failure($"Example con ID {id} no encontrado.");

        existing.Update(request.Name, request.Description);
        await _repository.UpdateAsync(existing, cancellationToken);

        return Result<ExampleDto>.Success(existing.ToDto());
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var deleted = await _repository.DeleteAsync(id, cancellationToken);
        if (!deleted)
            return Result.Failure($"Example con ID {id} no encontrado.");

        return Result.Success();
    }

    public async Task<IEnumerable<ExampleDto>> SearchAsync(
        string keyword,
        CancellationToken cancellationToken = default)
    {
        var all = await _repository.GetAllAsync(cancellationToken);
        return all
            .Where(e => e.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                     || (e.Description?.Contains(keyword, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToDtoList();
    }
}
