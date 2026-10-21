---
name: clean-architecture
description: Reglas y patrones de Clean Architecture para la plantilla win-services-api. Cubre estructura de capas, flujo de dependencias, registro de DI por capa y el workflow completo para agregar una entidad nueva.
---

# Clean Architecture — win-services-api

## Flujo de dependencias

```
Api → Infrastructure → Application → Domain
```

Nunca en sentido contrario. Domain no importa nada externo.

## Workflow para agregar una entidad (11 pasos)

### 1. Entidad en Domain
```csharp
public sealed class MiEntidad : BaseEntity
{
    public string Campo { get; private set; } = default!;
    private MiEntidad() { }  // requerido por Dapper
    public static MiEntidad Create(string campo) => new() { Campo = campo };
    public void Actualizar(string campo) { Campo = campo; UpdatedAt = DateTime.UtcNow; }
}
```

### 2. DTOs en Application/DTOs/
```csharp
public sealed record MiEntidadDto(int Id, string Campo, DateTime CreatedAt);
public sealed record CreateMiEntidadRequest(string Campo);
public sealed record UpdateMiEntidadRequest(string Campo);
```

### 3. Validador en Application/Validators/
```csharp
public sealed class CreateMiEntidadValidator : AbstractValidator<CreateMiEntidadRequest>
{
    public CreateMiEntidadValidator()
    {
        RuleFor(x => x.Campo).NotEmpty().MaximumLength(100);
    }
}
```
> No registrar manualmente. `AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly)` lo detecta.

### 4. Mapper en Application/Mapping/
```csharp
[Mapper]
public static partial class MiEntidadMapper
{
    public static partial MiEntidadDto ToDto(this MiEntidad entidad);
    public static partial IEnumerable<MiEntidadDto> ToDtoList(this IEnumerable<MiEntidad> entidades);
}
```

### 5. Interfaz repositorio en Application/Interfaces/
```csharp
public interface IMiEntidadRepository : IRepository<MiEntidad>
{
    Task<MiEntidad?> GetByCampoAsync(string campo, CancellationToken ct = default);
}
```

### 6. Interfaz servicio en Application/Interfaces/
```csharp
public interface IMiEntidadService
{
    Task<IEnumerable<MiEntidadDto>> GetAllAsync(CancellationToken ct = default);
    Task<MiEntidadDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<MiEntidadDto>> CreateAsync(CreateMiEntidadRequest request, CancellationToken ct = default);
    Task<Result<MiEntidadDto>> UpdateAsync(int id, UpdateMiEntidadRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
```

### 7. Servicio en Application/Services/
```csharp
public sealed class MiEntidadService : IMiEntidadService
{
    private readonly IMiEntidadRepository _repo;
    private readonly IValidator<CreateMiEntidadRequest> _createValidator;
    private readonly IValidator<UpdateMiEntidadRequest> _updateValidator;
    private readonly ILogger<MiEntidadService> _logger;

    // constructor, métodos con validación + mapeo + logging
}
```

### 8. Repositorio en Infrastructure/Repositories/
```csharp
public sealed class MiEntidadRepository : BaseRepository, IMiEntidadRepository
{
    public MiEntidadRepository(IDbConnectionFactory factory) : base(factory) { }
    // métodos con Dapper — SQL explícito
}
```

### 9. Controller en Api/Controllers/
```csharp
[ApiController]
[Route("api/mi-entidad")]
[Authorize]
public sealed class MiEntidadController : ControllerBase
{
    private readonly IMiEntidadService _service;
    public MiEntidadController(IMiEntidadService service) => _service = service;
    // endpoints GET, POST, PUT, DELETE
}
```

### 10. Registro en DependencyInjection.cs de cada capa
```csharp
// Application/DependencyInjection.cs
services.AddScoped<IMiEntidadService, MiEntidadService>();

// Infrastructure/DependencyInjection.cs
services.AddScoped<IMiEntidadRepository, MiEntidadRepository>();
```

### 11. SQL de la tabla (manual — Dapper no genera migraciones)
```sql
CREATE TABLE MiEntidad (
    Id        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Campo     VARCHAR(100) NOT NULL,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL
);
```

## Patrón Result<T>

Siempre devuelve `Result<T>` o `Result` desde servicios. Nunca lances excepciones para flujo de negocio.

```csharp
// Éxito
return Result<MiEntidadDto>.Success(entity.ToDto());

// Error de validación o negocio
return Result<MiEntidadDto>.Failure("Mensaje descriptivo del error.");
```
