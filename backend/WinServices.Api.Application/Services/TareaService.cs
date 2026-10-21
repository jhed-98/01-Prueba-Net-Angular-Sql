using FluentValidation;
using Microsoft.Extensions.Logging;
using WinServices.Api.Application.Common;
using WinServices.Api.Application.DTOs;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Application.Services;

public sealed class TareaService : ITareaService
{
    private readonly ITareaRepository _repository;
    private readonly IValidator<CreateTareaRequest> _createValidator;
    private readonly ILogger<TareaService> _logger;

    public TareaService(
        ITareaRepository repository,
        IValidator<CreateTareaRequest> createValidator,
        ILogger<TareaService> logger)
    {
        _repository      = repository;
        _createValidator = createValidator;
        _logger          = logger;
    }

    public Task<IEnumerable<TareaDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        return _repository.ListarAsync(null, cancellationToken);
    }

    public async Task<Result<TareaDto>> CrearAsync(
        CreateTareaRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            _logger.LogWarning("Validación fallida al crear Tarea: {Errors}", errors);
            return Result<TareaDto>.Failure(errors);
        }

        var id = await _repository.CrearAsync(request, cancellationToken);

        var tareas = await _repository.ListarAsync(request.CategoriaId, cancellationToken);
        var creada = tareas.FirstOrDefault(t => t.Id == id);
        if (creada is null)
        {
            _logger.LogError("Tarea creada con ID {Id} no encontrada al recargarla", id);
            return Result<TareaDto>.Failure($"Tarea con ID {id} no encontrada tras crearla.");
        }

        _logger.LogInformation("Tarea creada con ID {Id}", id);
        return Result<TareaDto>.Success(creada);
    }
}
