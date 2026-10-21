namespace WinServices.Api.Application.Interfaces;

public interface IJwtProvider
{
    string GenerateToken(string userId, string email, string role);
}
