using WinServices.Api.Application.Common;
using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Application.Interfaces;

// TODO: Reemplaza con la interfaz de servicio de tu entidad real.
public interface IExampleService
{
    Task<IEnumerable<ExampleDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ExampleDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<ExampleDto>> CreateAsync(CreateExampleRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExampleDto>> UpdateAsync(int id, UpdateExampleRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<ExampleDto>> SearchAsync(string keyword, CancellationToken cancellationToken = default);
}
