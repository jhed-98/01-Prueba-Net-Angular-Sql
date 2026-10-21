---
name: dapper-patterns
description: Patrones de acceso a datos con Dapper en la plantilla win-services-api. Cubre CRUD básico, queries dinámicos, stored procedures, transacciones, relaciones one-to-many y many-to-many.
---

# Dapper — Patrones de acceso a datos

## BaseRepository

Todos los repositorios heredan de `BaseRepository` y acceden a la conexión via `ConnectionFactory`:

```csharp
public sealed class MiRepository : BaseRepository, IMiRepository
{
    public MiRepository(IDbConnectionFactory factory) : base(factory) { }

    public async Task<MiEntidad?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<MiEntidad>(
            "SELECT * FROM MiEntidad WHERE Id = @Id", new { Id = id });
    }
}
```

## CRUD básico

```csharp
// INSERT con LAST_INSERT_ID() (MySQL)
public async Task<int> AddAsync(MiEntidad entity, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    return await conn.ExecuteScalarAsync<int>(
        @"INSERT INTO MiEntidad (Campo, CreatedAt) VALUES (@Campo, @CreatedAt);
          SELECT LAST_INSERT_ID();",
        new { entity.Campo, entity.CreatedAt });
}

// UPDATE
public async Task UpdateAsync(MiEntidad entity, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    await conn.ExecuteAsync(
        "UPDATE MiEntidad SET Campo = @Campo, UpdatedAt = @UpdatedAt WHERE Id = @Id",
        new { entity.Campo, entity.UpdatedAt, entity.Id });
}

// DELETE
public async Task DeleteAsync(int id, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    await conn.ExecuteAsync("DELETE FROM MiEntidad WHERE Id = @Id", new { Id = id });
}
```

## Query dinámico con DynamicParameters

```csharp
public async Task<IEnumerable<MiEntidad>> SearchAsync(string? campo, bool? activo, CancellationToken ct = default)
{
    var sql = new StringBuilder("SELECT * FROM MiEntidad WHERE 1=1");
    var parameters = new DynamicParameters();

    if (!string.IsNullOrWhiteSpace(campo))
    {
        sql.Append(" AND Campo LIKE @Campo");
        parameters.Add("Campo", $"%{campo}%");
    }

    if (activo.HasValue)
    {
        sql.Append(" AND Activo = @Activo");
        parameters.Add("Activo", activo.Value);
    }

    using var conn = ConnectionFactory.CreateConnection();
    return await conn.QueryAsync<MiEntidad>(sql.ToString(), parameters);
}
```

## Stored Procedures

```csharp
// SP básico
public async Task<IEnumerable<MiEntidad>> SearchSpAsync(string keyword, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    return await conn.QueryAsync<MiEntidad>(
        "sp_SearchMiEntidad",
        new { Keyword = keyword },
        commandType: CommandType.StoredProcedure);
}

// SP con parámetro de salida
public async Task<int> CrearConOutputAsync(string campo, CancellationToken ct = default)
{
    var parameters = new DynamicParameters();
    parameters.Add("@p_Campo", campo);
    parameters.Add("@p_NewId", dbType: DbType.Int32, direction: ParameterDirection.Output);

    using var conn = ConnectionFactory.CreateConnection();
    await conn.ExecuteAsync("sp_CrearMiEntidad", parameters,
        commandType: CommandType.StoredProcedure);

    return parameters.Get<int>("@p_NewId");
}
```

## Transacciones

```csharp
public async Task TransferirAsync(int origenId, int destinoId, decimal monto, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    conn.Open();
    using var tx = conn.BeginTransaction();

    try
    {
        await conn.ExecuteAsync(
            "UPDATE Cuentas SET Saldo = Saldo - @Monto WHERE Id = @Id",
            new { Monto = monto, Id = origenId }, transaction: tx);

        await conn.ExecuteAsync(
            "UPDATE Cuentas SET Saldo = Saldo + @Monto WHERE Id = @Id",
            new { Monto = monto, Id = destinoId }, transaction: tx);

        tx.Commit();
    }
    catch
    {
        tx.Rollback();
        throw;
    }
}
```

## Relaciones One-to-Many

Dapper no gestiona relaciones automáticamente. Dos estrategias:

### Opción A — Dos queries (recomendada para colecciones grandes)

Evita registros duplicados del padre. Más eficiente en conjuntos grandes.

```csharp
public async Task<IEnumerable<Empresa>> GetAllConTecnicosAsync(CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    var empresas = (await conn.QueryAsync<Empresa>("SELECT * FROM Empresas")).ToList();

    if (!empresas.Any()) return empresas;

    var tecnicos = await conn.QueryAsync<Tecnico>(
        "SELECT * FROM Tecnicos WHERE EmpresaId IN @Ids",
        new { Ids = empresas.Select(e => e.Id) });

    var lookup = empresas.ToDictionary(e => e.Id);
    foreach (var tecnico in tecnicos)
    {
        if (lookup.TryGetValue(tecnico.EmpresaId, out var empresa))
            empresa.AddTecnico(tecnico);
    }

    return empresas;
}
```

### Opción B — Multi-mapping con JOIN (útil para cargar un solo padre)

```csharp
public async Task<Empresa?> GetConTecnicosAsync(int id, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    Empresa? empresa = null;

    await conn.QueryAsync<Empresa, Tecnico, Empresa>(
        @"SELECT e.Id, e.RazonSocial,
                 t.Id AS TecnicoId, t.Nombres, t.EmpresaId
          FROM   Empresas e
          LEFT   JOIN Tecnicos t ON t.EmpresaId = e.Id
          WHERE  e.Id = @Id",
        (emp, tecnico) =>
        {
            empresa ??= emp;
            if (tecnico is not null) empresa.AddTecnico(tecnico);
            return empresa;
        },
        new { Id = id },
        splitOn: "TecnicoId");  // aliasa t.Id para que Dapper sepa dónde inicia el segundo tipo

    return empresa;
}
```

> **Regla `splitOn`**: aliasa siempre el `Id` del hijo (`t.Id AS TecnicoId`) para distinguirlo
> del `Id` del padre. Sin alias, Dapper divide en el primer `Id` y mapea mal.

## Relaciones Many-to-Many

```csharp
// Técnico ↔ Servicio (tabla pivote TecnicoServicios)
public async Task<IEnumerable<Servicio>> GetServiciosByTecnicoAsync(int tecnicoId, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    return await conn.QueryAsync<Servicio>(
        @"SELECT s.*
          FROM   Servicios s
          INNER  JOIN TecnicoServicios ts ON ts.ServicioId = s.Id
          WHERE  ts.TecnicoId = @TecnicoId",
        new { TecnicoId = tecnicoId });
}

public async Task AsignarServicioAsync(int tecnicoId, int servicioId, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    await conn.ExecuteAsync(
        "INSERT IGNORE INTO TecnicoServicios (TecnicoId, ServicioId) VALUES (@TecnicoId, @ServicioId)",
        new { TecnicoId = tecnicoId, ServicioId = servicioId });
}
```

## Cambiar proveedor de BD

| Proveedor | Paquete | Conexión | Last Insert |
|---|---|---|---|
| MySQL | `MySqlConnector` | `new MySqlConnection(cs)` | `SELECT LAST_INSERT_ID()` |
| PostgreSQL | `Npgsql` | `new NpgsqlConnection(cs)` | `RETURNING Id` |
| SQL Server | `Microsoft.Data.SqlClient` | `new SqlConnection(cs)` | `SELECT SCOPE_IDENTITY()` |
