using WinServices.Api.Infrastructure.Data;

namespace WinServices.Api.Infrastructure.Repositories;

public abstract class BaseRepository
{
    protected readonly IDbConnectionFactory ConnectionFactory;

    protected BaseRepository(IDbConnectionFactory connectionFactory)
    {
        ConnectionFactory = connectionFactory;
    }
}
