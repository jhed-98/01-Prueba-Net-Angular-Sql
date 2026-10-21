using WinServices.Api.Domain.Entities;

namespace WinServices.Api.Application.Interfaces;

/// <summary>
/// Contrato de repositorio de ejemplo para mostrar la conexión entre Application e Infrastructure.
/// </summary>
public interface IExampleRepository
{
    Task<IEnumerable<Example>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Example?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<int> CreateAsync(Example entity, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Example entity, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
