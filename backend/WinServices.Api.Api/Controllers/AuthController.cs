using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Api.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/auth")]
[ApiVersion(1.0)]
public sealed class AuthController : ControllerBase
{
    private readonly IJwtProvider _jwtProvider;
    private readonly IPasswordHasher _passwordHasher;

    public AuthController(IJwtProvider jwtProvider, IPasswordHasher passwordHasher)
    {
        _jwtProvider     = jwtProvider;
        _passwordHasher  = passwordHasher;
    }

    /// <summary>Obtiene un token JWT a partir de credenciales.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // TODO: Reemplaza con búsqueda real del usuario en el repositorio.
        // var user = await _userRepository.GetByEmailAsync(request.Email);
        // if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        //     return Unauthorized(new { message = "Credenciales inválidas." });

        // Stub temporal — eliminar antes de producción.
        if (request.Email != "admin@example.com" || request.Password != "admin123")
            return Unauthorized(new { message = "Credenciales inválidas." });

        var token = _jwtProvider.GenerateToken("1", request.Email, "Admin");
        return Ok(new { accessToken = token });
    }
}

public sealed record LoginRequest(string Email, string Password);
