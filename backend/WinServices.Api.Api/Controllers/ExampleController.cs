using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WinServices.Api.Application.DTOs;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Infrastructure.Http;

namespace WinServices.Api.Api.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/examples")]
[ApiVersion(1.0)]
public sealed class ExampleController : ControllerBase
{
    private readonly IExampleService _service;
    private readonly ExampleHttpService _httpService;

    public ExampleController(IExampleService service, ExampleHttpService httpService)
    {
        _service     = service;
        _httpService = httpService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var items = await _service.GetAllAsync(cancellationToken);
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Búsqueda en memoria.
    /// GET /api/v1/examples/search?keyword=test
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string keyword, CancellationToken cancellationToken)
    {
        var items = await _service.SearchAsync(keyword, cancellationToken);
        return Ok(items);
    }

    /// <summary>
    /// Ejemplo de consumo de una API externa pública (JSONPlaceholder).
    /// GET /api/v1/examples/posts
    /// </summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts(CancellationToken cancellationToken)
    {
        var posts = await _httpService.GetPostsAsync(cancellationToken);
        return Ok(posts ?? new List<RemotePost>());
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateExampleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateExampleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, request, cancellationToken);
        if (!result.IsSuccess)
            return result.Error!.Contains("no encontrado") ? NotFound(new { error = result.Error }) : BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _service.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
            return NotFound(new { error = result.Error });

        return NoContent();
    }
}
