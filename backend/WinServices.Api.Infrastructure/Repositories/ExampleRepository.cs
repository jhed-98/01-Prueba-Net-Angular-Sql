using System.Data;
using Dapper;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Domain.Entities;
using WinServices.Api.Infrastructure.Data;

namespace WinServices.Api.Infrastructure.Repositories;

/// <summary>
/// Repositorio de referencia utilizando Dapper + Stored Procedures sobre SQL Server.
/// Puedes guiarte de esta estructura para implementar los repositorios de tu evaluación.
/// </summary>
public sealed class ExampleRepository : BaseRepository, IExampleRepository
{
    public ExampleRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
    {
    }

    public async Task<IEnumerable<Example>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        return await connection.QueryAsync<Example>(
            "dbo.usp_Example_Listar",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<Example?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<Example>(
            "dbo.usp_Example_ObtenerPorId",
            new { Id = id },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<int> CreateAsync(Example entity, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        var parameters = new
        {
            Name = entity.Name,
            Description = entity.Description
        };

        return await connection.QuerySingleAsync<int>(
            "dbo.usp_Example_Crear",
            parameters,
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<bool> UpdateAsync(Example entity, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        var parameters = new
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description
        };

        var rows = await connection.ExecuteAsync(
            "dbo.usp_Example_Actualizar",
            parameters,
            commandType: CommandType.StoredProcedure
        );
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            "dbo.usp_Example_Eliminar",
            new { Id = id },
            commandType: CommandType.StoredProcedure
        );
        return rows > 0;
    }
}
