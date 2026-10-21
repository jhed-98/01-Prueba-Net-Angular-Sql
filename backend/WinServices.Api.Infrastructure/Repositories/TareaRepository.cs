using System.Data;
using Dapper;
using WinServices.Api.Application.DTOs;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Infrastructure.Data;

namespace WinServices.Api.Infrastructure.Repositories;

/// <summary>
/// Repositorio de Tareas utilizando Dapper + Stored Procedures sobre SQL Server.
/// </summary>
public sealed class TareaRepository : BaseRepository, ITareaRepository
{
    public TareaRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
    {
    }

    public async Task<IEnumerable<TareaDto>> ListarAsync(int? categoriaId = null, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        var command = new CommandDefinition(
            "dbo.usp_Tarea_Listar",
            new { CategoriaId = categoriaId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken
        );

        return await connection.QueryAsync<TareaDto>(command);
    }

    public async Task<int> CrearAsync(CreateTareaRequest request, CancellationToken cancellationToken = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        var parameters = new DynamicParameters();
        parameters.Add("Titulo", request.Titulo);
        parameters.Add("Descripcion", request.Descripcion);
        parameters.Add("FechaInicio", request.FechaInicio);
        parameters.Add("FechaFin", request.FechaFin);
        parameters.Add("CategoriaId", request.CategoriaId);

        // Si no se envía Estado, se omite para que aplique el default 'PENDIENTE' del SP.
        if (!string.IsNullOrWhiteSpace(request.Estado))
        {
            parameters.Add("Estado", request.Estado);
        }

        var command = new CommandDefinition(
            "dbo.usp_Tarea_Crear",
            parameters,
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken
        );

        return await connection.QuerySingleAsync<int>(command);
    }
}
