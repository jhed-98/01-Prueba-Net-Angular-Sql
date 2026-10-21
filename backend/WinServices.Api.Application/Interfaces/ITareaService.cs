using WinServices.Api.Application.Common;
using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Application.Interfaces;

public interface ITareaService
{
    Task<IEnumerable<TareaDto>> ListarAsync(CancellationToken cancellationToken = default);
    Task<Result<TareaDto>> CrearAsync(CreateTareaRequest request, CancellationToken cancellationToken = default);
}
