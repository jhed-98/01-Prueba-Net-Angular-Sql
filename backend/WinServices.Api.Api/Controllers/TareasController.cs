using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using WinServices.Api.Application.DTOs;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Api.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/tareas")]
[ApiVersion(1.0)]
public sealed class TareasController : ControllerBase
{
    private readonly ITareaService _service;

    public TareasController(ITareaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var items = await _service.ListarAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTareaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CrearAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }
}
