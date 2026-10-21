using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Application.Interfaces;

public interface ITareaRepository
{
    Task<IEnumerable<TareaDto>> ListarAsync(int? categoriaId = null, CancellationToken cancellationToken = default);
    Task<int> CrearAsync(CreateTareaRequest request, CancellationToken cancellationToken = default);
}
