# Win-Services-Api — Clean Architecture API

Plantilla para proyectos **API REST** con Clean Architecture, Dapper y JWT.

---

## Estructura de directorios

La plantilla aplica **Clean Architecture** dividida en cuatro capas con dependencias unidireccionales:
`Domain` ← `Application` ← `Infrastructure` ← `Api`. Cada capa tiene una responsabilidad única y no puede
importar directamente la capa superior. Esto garantiza que la lógica de negocio sea independiente del
framework, la base de datos y el transporte HTTP.

```
WinServices/
├── WinServices.Domain/
│   └── Entities/           # Entidades de dominio (sin dependencias externas)
├── WinServices.Application/
│   ├── Common/             # Result<T>, tipos compartidos
│   ├── DTOs/               # Request y Response DTOs (records inmutables)
│   ├── Interfaces/         # Contratos de repositorios y servicios
│   ├── Mapping/            # Mappers Mapperly (source generation)
│   ├── Services/           # Lógica de aplicación
│   └── Validators/         # Validadores FluentValidation
├── WinServices.Infrastructure/
│   ├── Authentication/     # JwtProvider, PasswordHasher
│   ├── Data/               # DbConnectionFactory, IDbConnectionFactory
│   └── Repositories/       # Implementaciones Dapper
└── WinServices.Api/
    ├── Controllers/        # Endpoints HTTP
    ├── Program.cs          # Composición raíz (DI, Serilog, Scalar)
    └── appsettings.json
```

---

## Get Started

### 1. Instalar y crear el proyecto

```bash
# Instalar la plantilla (desde el directorio raíz de la plantilla)
dotnet new install ./win-services-api

# Crear proyecto mínimo (sin código de ejemplo)
dotnet new win-services-api --name WinServices

# Crear proyecto con código de ejemplo completo (--WithSample)
dotnet new win-services-api --name WinServices --WithSample true

# Acceder al proyecto recién creado
cd WinServices

# Desinstalar la plantilla
dotnet new uninstall ./win-services-api

# Actualizar la plantilla (desinstalar + reinstalar)
dotnet new uninstall ./win-services-api && dotnet new install ./win-services-api
```

#### Modo mínimo vs. con ejemplo (`--WithSample`)

| | Sin `--WithSample` (default) | Con `--WithSample true` |
|---|---|---|
| Entidad de dominio | Solo `BaseEntity` | + `Example.cs` |
| DTOs / Validadores / Mapper | Carpetas vacías | + `ExampleDto`, `CreateExampleRequest`, `UpdateExampleRequest`, validadores y mapper |
| Servicio | Solo interfaces base | + `ExampleService` (CRUD en memoria) |
| Controller | Solo `AuthController` | + `ExampleController` (CRUD en memoria + consumo de API externa) |
| Cliente HTTP | Solo `HttpServiceBase` | + `ExampleHttpService` (JSONPlaceholder) |
| DI (`DependencyInjection.cs`) | Comentario `TODO:` | Registros activos de Example |

> El ejemplo (`--WithSample true`) **no requiere base de datos**: `ExampleService` mantiene los datos
> en memoria y `ExampleHttpService` consume la API pública JSONPlaceholder. Sirve para explorar los
> patrones de la plantilla (FluentValidation, Mapperly, RestSharp, Polly) antes de reemplazarlos por
> tu lógica real. Cuando vayas a implementar una entidad con BD, usa Dapper en un repositorio real.

### 2. Configurar la base de datos (solo si usas BD)

> El modo mínimo y el ejemplo **arrancan sin BD**. Configura `DefaultConnection` únicamente cuando
> implementes tu primera entidad con persistencia real.

Edita `WinServices.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=mi_db;Uid=dev;Pwd=devpassword;"
  },
  "JwtSettings": {
    "Secret": "una-clave-secreta-de-al-menos-32-caracteres",
    "Issuer": "WinServices",
    "Audience": "WinServicesUsers",
    "ExpiryMinutes": "1440"
  }
}
```

Para tu entidad real, crea la tabla correspondiente (el ejemplo en memoria no usa tabla):

```sql
CREATE TABLE Examples (
    Id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Name        VARCHAR(100) NOT NULL,
    Description VARCHAR(500) NULL,
    CreatedAt   DATETIME     NOT NULL,
    UpdatedAt   DATETIME     NULL
);
```

### 3. Ejecutar

```bash
dotnet run --project WinServices.Api
```

Scalar UI disponible en: `http://localhost:5000/scalar/v1`

---

## Arrancar sin observabilidad

Todos los servicios externos (BD, Redis, RabbitMQ, Jaeger) son **opcionales y configurables**.
Si una clave de configuración está vacía, la app arranca igual sin ese servicio y `/health`
reporta menos checks. Puedes ejecutar la plantilla por sí sola, sin infraestructura.

Para correr sin dependencias, deja vacías estas claves en `.env` (o no las definas):

| Clave | Vacía → comportamiento |
|---|---|
| `ConnectionStrings__DefaultConnection` | Sin BD, sin health check `database` |
| `Redis__ConnectionString` | Sin `ICacheService`, sin health check `redis` |
| `RabbitMQ__Host` | Sin sink de logs a RabbitMQ; `IMessageBus` → `NoOpMessageBus` |
| `OpenTelemetry__OtlpEndpoint` | OTel instrumenta pero no exporta (sin Jaeger) |
| `JwtSettings__Secret` | Sin /login funcional ni validación de tokens; la app arranca igual |
| `Security__ApiKey` | Sin validación `X-Api-Key` (opt-in) |

> Todas las claves son opcionales y se registran en DI de forma condicional
> (`if (!string.IsNullOrWhiteSpace(...))`), no por descomentar código.

Ejemplo de `/health` sin servicios configurados:

```json
{
  "status": "Healthy",
  "duration": 0.12,
  "checks": []
}
```

---

## Librerías incluidas

| Librería | Capa | Propósito |
|---|---|---|
| **Dapper** | Infrastructure | Micro-ORM — consultas SQL directas con mapeo de objetos |
| **MySqlConnector** | Infrastructure | Driver MySQL asíncrono de alto rendimiento |
| **BCrypt.Net-Next** | Infrastructure | Hashing seguro de contraseñas |
| **RestSharp** | Infrastructure | Cliente HTTP para consumir APIs externas |
| **Polly** | Infrastructure | Resiliencia: retry y circuit breaker para clientes HTTP |
| **StackExchange.Redis** | Infrastructure | Caché distribuido — patrón Cache-Aside |
| **RabbitMQ.Client** | Infrastructure | Mensajería asíncrona — publicación y consumo de eventos |
| **FluentValidation** | Application | Validación declarativa de DTOs con mensajes de error descriptivos |
| **Mapperly** | Application | Mapeo de objetos por source generation (sin reflection en runtime) |
| **Serilog** | Api | Logging estructurado — Console, File y sink RabbitMQ (canal durable) |
| **OpenTelemetry** | Api | Trazas distribuidas vía OTLP/gRPC hacia Jaeger |
| **Scalar** | Api | UI para explorar la API (reemplaza Swashbuckle, incompatible con .NET 10) |

> **Nota sobre Swashbuckle**: `Swashbuckle.AspNetCore 7.x` usa `Microsoft.OpenApi 1.x` internamente,
> pero .NET 10 incluye `Microsoft.OpenApi 2.0` en el runtime del framework. Son binariamente incompatibles.
> **Scalar.AspNetCore** es el reemplazo recomendado para .NET 10.
> UI disponible en: `http://localhost:5000/scalar/v1`

---

## Cómo desarrollar: agregar una nueva entidad

> Esta sección es una **guía para principiantes absolutos**. Imagina que construimos una "ficha de
> técnico" (un técnico de instalación que va a las casas a instalar internet). Queremos poder:
> guardar técnicos, listarlos, buscarlos por documento, y borrarlos.
>
> Al final de esta guía tendrás la API funcionando con ese ejemplo (necesita una base de datos MySQL).

### La idea general: una "fábrica" de 4 pisos

Piensa en la aplicación como una fábrica con 4 pisos. Cada piso solo puede pedir cosas al **piso de abajo**, nunca al de arriba:

```
  PISO 4  Api            → recibe el pedido del cliente por internet (HTTP)
  PISO 3  Infrastructure → habla con la base de datos (Dapper), con APIs externas, etc.
  PISO 2  Application    → organiza el trabajo (valida, decide, usa el servicio)
  PISO 1  Domain         → define qué es un "Técnico" (la receta del dato)
```

La regla de oro: **nadie puede subir, solo bajar**. La `Api` usa `Application`, `Application` usa
`Infrastructure` (para guardar), y todos usan `Domain` (el molde del dato).

---

### Paso 1 — La "receta" del Técnico (Domain)

**Qué es**: este archivo define **qué es** un técnico y **qué sabe hacer**. No sabe guardar en la
base de datos — solo es la "plantilla" del dato.

```csharp
// WinServices.Domain/Entities/Tecnico.cs
namespace WinServices.Domain.Entities;

public sealed class Tecnico : BaseEntity
{
    public string Nombres      { get; private set; } = default!;
    public string Apellidos    { get; private set; } = default!;
    public string NroDocumento { get; private set; } = default!;
    public bool   Activo       { get; private set; }

    private Tecnico() { } // requerido por Dapper para mapeo

    public static Tecnico Create(string nombres, string apellidos, string nroDocumento) =>
        new() { Nombres = nombres, Apellidos = apellidos, NroDocumento = nroDocumento, Activo = true };

    public void Desactivar() => Activo = false;
    public void Actualizar(string nombres, string apellidos) =>
    {
        Nombres   = nombres;
        Apellidos = apellidos;
        UpdatedAt = DateTime.UtcNow;
    }
}
```

**Explicación línea por línea (en simple):**

| Código | Qué significa |
|---|---|
| `public sealed class Tecnico : BaseEntity` | Creamos una clase llamada `Tecnico`. `sealed` = nadie puede hacer una "copia con extras". Hereda de `BaseEntity`, que ya le da `Id`, `CreatedAt` y `UpdatedAt` (cuándo se creó y cuándo se modificó). |
| `public string Nombres { get; private set; }` | "Nombres" es un texto. `get` = se puede leer; `private set` = **solo esta clase** puede cambiarlo. Así nadie lo rompe por accidente. |
| `public bool Activo { get; private set; }` | `bool` = verdadero o falso. `Activo` = si el técnico sigue trabajando. |
| `private Tecnico() { }` | Constructor vacío **privado**. Dapper (el que lee de la BD) lo necesita para crear el objeto al leer una fila. Como es privado, nosotros no podemos crear un técnico "a lo loco" — nos obliga a usar `Create`. |
| `public static Tecnico Create(...)` | Es la **fábrica** del técnico: es la única forma "correcta" de crear uno. Recibe los datos y arma el objeto ya listo (con `Activo = true`). `static` = se llama sin necesidad de un objeto: `Tecnico.Create("Ana", "Pérez", "12345678")`. |
| `public void Desactivar()` | Cambia `Activo` a `false`. Es una **acción del técnico** (regla de negocio en el Domain). |
| `public void Actualizar(...)` | Cambia nombres/apellidos y marca `UpdatedAt` (cuándo se modificó). |

> **Regla**: en este archivo **no** se importa Dapper ni nada del framework. Solo lógica pura del dato.

---

### Paso 2 — Las "tarjetas" para pasar datos (DTOs en Application)

**Qué es**: los DTOs son como **tarjetas de papel** que se pasan entre el cliente y la fábrica.
Nunca mostramos el "Técnico" de verdad por internet; pasamos una copia limpia (el DTO).

`TecnicoDto` = cómo se ve un técnico **cuando lo devolvemos** (respuesta):

```csharp
// WinServices.Application/DTOs/TecnicoDto.cs
namespace WinServices.Application.DTOs;

public sealed record TecnicoDto(
    int Id,
    string Nombres,
    string Apellidos,
    string NroDocumento,
    bool Activo,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
```

`CreateTecnicoRequest` = cómo el cliente **nos pide** crear un técnico (entrada):

```csharp
// WinServices.Application/DTOs/CreateTecnicoRequest.cs
namespace WinServices.Application.DTOs;

public sealed record CreateTecnicoRequest(
    string Nombres,
    string Apellidos,
    string NroDocumento
);
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `sealed record` | Es una "tarjeta" **inmutable**: una vez creada, sus datos no cambian. Perfecta para pasar datos por la API. |
| `(int Id, string Nombres, ...)` | Son los "campos" de la tarjeta, en orden. El orden importa: se llena así. |
| `CreateTecnicoRequest` | Solo pide lo necesario para **crear** (nombres, apellidos, documento). No pide `Id` porque la BD lo asigna sola. |

> **¿Por qué no usar la entidad directamente?** Porque la entidad tiene reglas internas y campos que no
> deben salir. La "tarjeta" (DTO) es lo que el mundo exterior ve.

---

### Paso 3 — El "portero" que revisa la entrada (Validador con FluentValidation)

**Qué es**: antes de aceptar un `CreateTecnicoRequest`, un **validador** revisa que los datos tengan
sentido (que el nombre no esté vacío, que el DNI tenga 8 dígitos, etc.). Es como el portero de un
edificio: no deja entrar a cualquiera.

```csharp
// WinServices.Application/Validators/CreateTecnicoValidator.cs
using FluentValidation;
using WinServices.Application.DTOs;

namespace WinServices.Application.Validators;

public sealed class CreateTecnicoValidator : AbstractValidator<CreateTecnicoRequest>
{
    public CreateTecnicoValidator()
    {
        RuleFor(x => x.Nombres)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(50).WithMessage("Máximo 50 caracteres.")
            .Matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$").WithMessage("Solo se permiten letras.");

        RuleFor(x => x.NroDocumento)
            .NotEmpty().WithMessage("El número de documento es obligatorio.")
            .Length(8).WithMessage("El DNI debe tener 8 dígitos.")
            .Matches("^[0-9]+$").WithMessage("Solo se permiten dígitos.");
    }
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `: AbstractValidator<CreateTecnicoRequest>` | "Soy un validador de la tarjeta `CreateTecnicoRequest`". |
| `RuleFor(x => x.Nombres)` | "Voy a revisar el campo `Nombres`". |
| `.NotEmpty().WithMessage("...")` | "El campo no puede estar vacío. Si está vacío, avisa con este mensaje". |
| `.Length(8)` | "Debe tener exactamente 8 caracteres (el DNI)". |
| `.Matches("^[0-9]+$")` | "Solo puede tener números (0-9)". Ese símbolo raro es una **expresión regular**: `^[0-9]+$` significa "solo dígitos de principio a fin". |

**No hay que registrarlo a mano**: la línea `AddValidatorsFromAssembly(...)` (que ya está en
`Application/DependencyInjection.cs`) busca **solo** todos los validadores y los registra automáticamente.

---

### Paso 4 — El "traductor" (Mapper con Mapperly)

**Qué es**: un mapper convierte un "Técnico" (objeto interno) en un "TecnicoDto" (tarjeta para afuera).
Es como un traductor de idiomas: recibe una cosa y la convierte en otra.

```csharp
// WinServices.Application/Mapping/TecnicoMapper.cs
using Riok.Mapperly.Abstractions;
using WinServices.Application.DTOs;
using WinServices.Domain.Entities;

namespace WinServices.Application.Mapping;

[Mapper]
public static partial class TecnicoMapper
{
    public static partial TecnicoDto ToDto(this Tecnico tecnico);
    public static partial IEnumerable<TecnicoDto> ToDtoList(this IEnumerable<Tecnico> tecnicos);
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `[Mapper]` | Le dice a Mapperly: "genera tú el código de conversión". |
| `static partial class` | `partial` = "la clase se termina de escribir en otra parte" (Mapperly la completa al compilar). |
| `ToDto(this Tecnico tecnico)` | Convierte **un** Técnico en un TecnicoDto. |
| `ToDtoList(this IEnumerable<Tecnico> tecnicos)` | Convierte **una lista** de técnicos en una lista de DTOs. |

Como `Tecnico.Nombres` y `TecnicoDto.Nombres` se llaman **igual**, Mapperly los une solo. Si algún día
los nombres difieren, se usa `[MapProperty(...)]`:

```csharp
[MapProperty(nameof(Tecnico.NroDocumento), nameof(TecnicoDto.NroDocumento))]
public static partial TecnicoDto ToDto(this Tecnico tecnico);
```

> **⚠️ Error común (RMG020)**: como `Tecnico` hereda de `BaseEntity`, tiene `Id`, `CreatedAt` **y
> `UpdatedAt`**. Mapperly exige que **toda** propiedad del origen tenga un destino (o se ignore).
> Por eso el `TecnicoDto` **debe incluir `UpdatedAt`** (como en el Paso 2). Si lo omitieras, Mapperly
> fallaría en compilación con: `RMG020: The member UpdatedAt on the mapping source type ... is not mapped`.
>
> **Si no quieres exponer `UpdatedAt`** en la API, ignóralo explícitamente:
> ```csharp
> [MapperIgnoreSource(nameof(Tecnico.UpdatedAt))]
> public static partial TecnicoDto ToDto(this Tecnico tecnico);
> ```

---

### Paso 5 — El "contrato" del repositorio (interfaz en Application)

**Qué es**: una interfaz es un **contrato** que dice *qué* se puede hacer, sin decir *cómo*. Aquí
decimos: "cualquier repositorio de Técnicos debe saber hacer esto".

```csharp
// WinServices.Application/Interfaces/ITecnicoRepository.cs
using WinServices.Domain.Entities;

namespace WinServices.Application.Interfaces;

public interface ITecnicoRepository : IRepository<Tecnico>
{
    Task<Tecnico?> GetByNroDocumentoAsync(string nroDocumento, CancellationToken ct = default);
    Task<IEnumerable<Tecnico>> GetActivosAsync(CancellationToken ct = default);
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `interface ITecnicoRepository` | "Esto es un contrato: quien lo cumpla, debe implementar estos métodos". |
| `: IRepository<Tecnico>` | Hereda de un contrato genérico que ya trae lo básico: `GetById`, `GetAll`, `Add`, `Update`, `Delete`. |
| `Task<Tecnico?> ...` | `Task` = "esto tarda un poco (async/await)". `Tecnico?` = "puede devolver un técnico o `null` (si no existe)". |
| `CancellationToken ct = default` | "Si el usuario cancela la petición, para de trabajar" (es una buena práctica). |

> Aquí **no** se menciona MySQL ni Dapper. Solo decimos **qué** se hace; el *cómo* viene en el Paso 6.

---

### Paso 6 — El repositorio de verdad (Dapper en Infrastructure)

**Qué es**: aquí se cumple el contrato del Paso 5 **usando la base de datos**. Dapper es un "mensajero
rápido" que convierte filas de la BD en objetos `Tecnico`.

```csharp
// WinServices.Infrastructure/Repositories/TecnicoRepository.cs
using System.Data;
using Dapper;
using WinServices.Application.Interfaces;
using WinServices.Domain.Entities;
using WinServices.Infrastructure.Data;

namespace WinServices.Infrastructure.Repositories;

public sealed class TecnicoRepository : BaseRepository, ITecnicoRepository
{
    public TecnicoRepository(IDbConnectionFactory factory) : base(factory) { }

    public async Task<Tecnico?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<Tecnico>(
            "SELECT * FROM Tecnicos WHERE Id = @Id", new { Id = id });
    }

    public async Task<IEnumerable<Tecnico>> GetAllAsync(CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.QueryAsync<Tecnico>("SELECT * FROM Tecnicos ORDER BY Apellidos");
    }

    public async Task<int> AddAsync(Tecnico entity, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            @"INSERT INTO Tecnicos (Nombres, Apellidos, NroDocumento, Activo, CreatedAt)
              VALUES (@Nombres, @Apellidos, @NroDocumento, @Activo, @CreatedAt);
              SELECT LAST_INSERT_ID();",
            new { entity.Nombres, entity.Apellidos, entity.NroDocumento, entity.Activo, entity.CreatedAt });
    }

    public async Task UpdateAsync(Tecnico entity, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            @"UPDATE Tecnicos SET Nombres = @Nombres, Apellidos = @Apellidos, UpdatedAt = @UpdatedAt
              WHERE Id = @Id",
            new { entity.Nombres, entity.Apellidos, entity.UpdatedAt, entity.Id });
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM Tecnicos WHERE Id = @Id", new { Id = id });
    }

    public async Task<Tecnico?> GetByNroDocumentoAsync(string nroDocumento, CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<Tecnico>(
            "SELECT * FROM Tecnicos WHERE NroDocumento = @NroDocumento", new { NroDocumento = nroDocumento });
    }

    public async Task<IEnumerable<Tecnico>> GetActivosAsync(CancellationToken ct = default)
    {
        using var conn = ConnectionFactory.CreateConnection();
        return await conn.QueryAsync<Tecnico>("SELECT * FROM Tecnicos WHERE Activo = 1");
    }
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `: BaseRepository, ITecnicoRepository` | Hereda de `BaseRepository` (que ya le da `ConnectionFactory`) y **cumple** el contrato `ITecnicoRepository`. |
| `public TecnicoRepository(IDbConnectionFactory factory) : base(factory) { }` | El constructor recibe la "llave" para conectarse a la BD y se la pasa a la clase base. Esto se inyecta automáticamente (DI). |
| `using var conn = ConnectionFactory.CreateConnection();` | "Abre una conexión a la base de datos". `using` = al terminar, se cierra sola (como cerrar el grifo). |
| `QueryFirstOrDefaultAsync<Tecnico>("SELECT ...")` | Ejecuta el SELECT y convierte **una** fila en un `Tecnico`. Si no hay fila, devuelve `null`. |
| `QueryAsync<Tecnico>("SELECT ...")` | Ejecuta el SELECT y convierte **muchas** filas en una lista de `Tecnico`. |
| `ExecuteScalarAsync<int>("INSERT ...; SELECT LAST_INSERT_ID();")` | Inserta y devuelve el **nuevo Id** que generó la BD. |
| `ExecuteAsync("UPDATE ...")` | Actualiza (no devuelve datos, solo afecta filas). |
| `@Nombres`, `@Id` | Son **parámetros con nombre**. Dapper los reemplaza por los valores del objeto anónimo `new { ... }`. **Nunca** se pega texto en el SQL (evita ataques de inyección). |

---

### Paso 7 — El "contrato" del servicio (interfaz en Application)

**Qué es**: un contrato que dice **qué operaciones** puede pedir el cliente (listar, crear, borrar).

```csharp
// WinServices.Application/Interfaces/ITecnicoService.cs
using WinServices.Application.Common;
using WinServices.Application.DTOs;

namespace WinServices.Application.Interfaces;

public interface ITecnicoService
{
    Task<IEnumerable<TecnicoDto>> GetAllAsync(CancellationToken ct = default);
    Task<TecnicoDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<TecnicoDto>> CreateAsync(CreateTecnicoRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `Result<TecnicoDto>` | Un "sobre" que dice si la operación fue **bien o mal**, y si fue bien, lleva el `TecnicoDto` adentro. Así el servicio **no lanza excepciones** para errores normales (ej. "ya existe"). |

---

### Paso 8 — El servicio (el "jefe" que organiza)

**Qué es**: el servicio recibe la petición, **valida**, usa el repositorio para guardar/leer, y devuelve
el resultado. Es el que decide las reglas de negocio.

```csharp
// WinServices.Application/Services/TecnicoService.cs
using FluentValidation;
using Microsoft.Extensions.Logging;
using WinServices.Application.Common;
using WinServices.Application.DTOs;
using WinServices.Application.Interfaces;
using WinServices.Application.Mapping;
using WinServices.Domain.Entities;

namespace WinServices.Application.Services;

public sealed class TecnicoService : ITecnicoService
{
    private readonly ITecnicoRepository _repo;
    private readonly IValidator<CreateTecnicoRequest> _validator;
    private readonly ILogger<TecnicoService> _logger;

    public TecnicoService(
        ITecnicoRepository repo,
        IValidator<CreateTecnicoRequest> validator,
        ILogger<TecnicoService> logger)
    {
        _repo      = repo;
        _validator = validator;
        _logger    = logger;
    }

    public async Task<IEnumerable<TecnicoDto>> GetAllAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Obteniendo todos los técnicos");
        return (await _repo.GetAllAsync(ct)).ToDtoList();
    }

    public async Task<TecnicoDto?> GetByIdAsync(int id, CancellationToken ct = default) =>
        (await _repo.GetByIdAsync(id, ct))?.ToDto();

    public async Task<Result<TecnicoDto>> CreateAsync(CreateTecnicoRequest request, CancellationToken ct = default)
    {
        var validation = await _validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
            _logger.LogWarning("Validación fallida: {Errors}", errors);
            return Result<TecnicoDto>.Failure(errors);
        }

        // Verificar duplicado de documento
        var existente = await _repo.GetByNroDocumentoAsync(request.NroDocumento, ct);
        if (existente is not null)
            return Result<TecnicoDto>.Failure("Ya existe un técnico con ese número de documento.");

        var tecnico = Tecnico.Create(request.Nombres, request.Apellidos, request.NroDocumento);
        var id      = await _repo.AddAsync(tecnico, ct);
        var creado  = await _repo.GetByIdAsync(id, ct);

        _logger.LogInformation("Técnico creado con ID {Id}", id);
        return Result<TecnicoDto>.Success(creado!.ToDto());
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        if (await _repo.GetByIdAsync(id, ct) is null)
            return Result.Failure($"Técnico con ID {id} no encontrado.");

        await _repo.DeleteAsync(id, ct);
        _logger.LogInformation("Técnico con ID {Id} eliminado", id);
        return Result.Success();
    }
}
```

**Explicación en simple del `CreateAsync` (el más importante):**

1. `await _validator.ValidateAsync(request)` → el portero revisa la tarjeta.
2. Si no es válida → `Result<TecnicoDto>.Failure(errors)` → devolvemos "falló" **sin tocar la BD**.
3. `_repo.GetByNroDocumentoAsync(...)` → revisa si ya existe un técnico con ese DNI.
4. `Tecnico.Create(...)` → crea el técnico usando la fábrica del Domain.
5. `_repo.AddAsync(tecnico)` → lo guarda en la BD y trae el nuevo Id.
6. `_repo.GetByIdAsync(id)` → lo vuelve a leer ya con todos los datos.
7. `.ToDto()` → lo convierte a tarjeta y lo devuelve con `Result.Success(...)`.

> `_logger.LogInformation("...{Id}", id)` → deja una "nota en el cuaderno" (log) para saber qué pasó.

---

### Paso 9 — El controller (la "ventanilla" que recibe el pedido)

**Qué es**: el controller recibe el pedido del cliente por HTTP, llama al servicio, y devuelve la
respuesta HTTP correcta. **No tiene lógica de negocio** — solo traduce.

```csharp
// WinServices.Api/Controllers/TecnicosController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WinServices.Application.DTOs;
using WinServices.Application.Interfaces;

namespace WinServices.Api.Controllers;

[ApiController]
[Route("api/tecnicos")]
[Authorize]
public sealed class TecnicosController : ControllerBase
{
    private readonly ITecnicoService _service;

    public TecnicosController(ITecnicoService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTecnicoRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(id, ct);
        return result.IsSuccess ? NoContent() : NotFound(new { error = result.Error });
    }
}
```

**Explicación en simple:**

| Código | Qué significa |
|---|---|
| `[Route("api/tecnicos")]` | La dirección: `GET/POST/DELETE /api/tecnicos`. |
| `[Authorize]` | Solo pueden entrar si traen un token válido (JWT). Si el JWT está desactivado, no bloquea. |
| `[HttpGet]` / `[HttpPost]` / `[HttpDelete]` | Qué verbo HTTP usa cada acción (leer / crear / borrar). |
| `Ok(...)` | Responde con código 200 (todo bien). |
| `NotFound()` | Responde con 404 (no encontré). |
| `BadRequest(...)` | Responde con 400 (tu petición tiene un error, ej. validación). |
| `CreatedAtAction(...)` | Responde con 201 (creado) y la ubicación del nuevo recurso. |
| `NoContent()` | Responde con 204 (se hizo, pero no hay contenido que devolver). |

---

### Paso 10 — Registrar en DI (decirle a la fábrica quién hace qué)

**Qué es**: DI (Inyección de Dependencias) es "el jefe que reparte los encargos". Hay que decirle:
"cuando alguien pida `ITecnicoService`, dale `TecnicoService`". Los registros van en el
`DependencyInjection.cs` de **cada capa**, nunca en `Program.cs`.

**En `WinServices.Application/DependencyInjection.cs`** — registra el servicio:
```csharp
public static IServiceCollection AddApplication(this IServiceCollection services)
{
    services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

    services.AddScoped<IExampleService, ExampleService>();
    services.AddScoped<ITecnicoService, TecnicoService>(); // ← agrega aquí
    return services;
}
```

**En `WinServices.Infrastructure/DependencyInjection.cs`** — registra el repositorio **solo si hay BD**:
```csharp
public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
{
    // ... DbConnectionFactory, Auth ...
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        services.AddScoped<ITecnicoRepository, TecnicoRepository>(); // ← agrega aquí
    }
    return services;
}
```

**¿Por qué el `if`?** Para que la aplicación arranque **sin** base de datos (si `DefaultConnection`
está vacío, no se registra el repositorio y no rompe el inicio). Cuando configures tu BD, se registra.

**`Program.cs`** no cambia — ya llama a ambos métodos:
```csharp
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
```

> Los validadores se detectan solos con `AddValidatorsFromAssembly(...)` — no necesitan registro manual.

---

### Paso 11 — La tabla en la base de datos (SQL manual)

**Qué es**: Dapper no crea tablas solas. Tú creas la tabla en MySQL (o con el script que prefieras).

```sql
CREATE TABLE Tecnicos (
    Id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Nombres      VARCHAR(50)  NOT NULL,
    Apellidos    VARCHAR(50)  NOT NULL,
    NroDocumento VARCHAR(9)   NOT NULL UNIQUE,
    Activo       TINYINT(1)   NOT NULL DEFAULT 1,
    CreatedAt    DATETIME     NOT NULL,
    UpdatedAt    DATETIME     NULL
);
```

**Explicación en simple:**

| Código SQL | Qué significa |
|---|---|
| `INT NOT NULL AUTO_INCREMENT PRIMARY KEY` | El `Id` es un número entero, obligatorio, que crece solo (1, 2, 3...) y es la llave principal (identifica cada fila). |
| `VARCHAR(50) NOT NULL` | Texto de hasta 50 letras, obligatorio. |
| `VARCHAR(9) NOT NULL UNIQUE` | Texto de hasta 9 (el DNI), obligatorio y **sin repetir** (no puede haber 2 técnicos con el mismo DNI). |
| `TINYINT(1) NOT NULL DEFAULT 1` | Un 0 o 1 (falso/verdadero) para `Activo`. Por defecto vale 1 (activo). |
| `DATETIME` | Fecha y hora. `UpdatedAt` puede ser `NULL` (todavía no se ha modificado). |

---

### Probar el ejemplo paso a paso

1. **Configura la BD** en `appsettings.Development.json` (o con variables de entorno):
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Port=3306;Database=mi_db;Uid=dev;Pwd=devpassword;"
     }
   }
   ```
2. **Crea la tabla** ejecutando el `CREATE TABLE` del Paso 11 en MySQL.
3. **Compila**:
   ```bash
   dotnet build
   ```
4. **Ejecuta**:
   ```bash
   dotnet run --project WinServices.Api
   ```
5. **Prueba en Scalar** (`http://localhost:5000/scalar/v1`):
   - `POST /api/tecnicos` con el body `{ "nombres": "Ana", "apellidos": "Pérez", "nroDocumento": "12345678" }` → debería responder 201 y el técnico creado.
   - `GET /api/tecnicos` → lista los técnicos.
   - `POST` de nuevo con el mismo DNI → 400 "Ya existe un técnico con ese número de documento".
   - `DELETE /api/tecnicos/1` → lo borra.

> Si el JWT está activo, primero llama a `POST /api/auth/login` para obtener el token y pégale al
> candado 🔒 de Scalar. Si el JWT está desactivado (Secret vacío), los endpoints responden sin token.

---


## Campos de auditoría con IAuditContext

Las entidades WIN requieren columnas de auditoría en cada fila: quién creó el registro, desde qué host,
con qué aplicación, y lo mismo al modificar. `IAuditContext` captura ese contexto del request HTTP
activo y lo inyecta en el servicio — sin que el controller ni los DTOs lo conozcan.

### Flujo completo

```
Request HTTP (JWT) → IHttpContextAccessor → AuditContext
                                                ↓
                                       ProductoService
                                                ↓
                              Entidad.Crear(userId, host, app)
                                                ↓
                                     Repository → DB
```

### Paso 1 — Interfaz en Application

Define el contrato en `Application/Interfaces/` — no en Infrastructure. Esto aplica el principio
de inversión de dependencias (DIP): el servicio depende de la abstracción, no de la implementación concreta.

```csharp
// WinServices.Application/Interfaces/IAuditContext.cs
namespace WinServices.Application.Interfaces;

public interface IAuditContext
{
    string UserId   { get; }  // ID del usuario autenticado (claim sub / NameIdentifier)
    string HostName { get; }  // Nombre del host que procesa el request
    string AppName  { get; }  // Nombre de la aplicación
}
```

### Paso 2 — Implementación en Infrastructure

La implementación lee los datos del `HttpContext` activo. Vive en `Infrastructure/Authentication/`
porque accede a `IHttpContextAccessor`, que es una dependencia de ASP.NET Core.

```csharp
// WinServices.Infrastructure/Authentication/AuditContext.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using WinServices.Application.Interfaces;

namespace WinServices.Infrastructure.Authentication;

public sealed class AuditContext : IAuditContext
{
    public string UserId   { get; }
    public string HostName { get; }
    public string AppName  { get; }

    public AuditContext(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;
        UserId   = user?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user?.FindFirstValue("sub")
                ?? "anonymous";
        HostName = Environment.MachineName;
        AppName  = "WinServices";
    }
}
```

`UserId` toma el claim `NameIdentifier` (estándar .NET) o `sub` (estándar JWT/OAuth2). Si no hay
usuario autenticado cae a `"anonymous"` — útil para endpoints públicos.

### Paso 3 — FrameworkReference en Infrastructure.csproj

`IHttpContextAccessor` es parte de ASP.NET Core. Una class library con SDK `Microsoft.NET.Sdk`
no lo incluye automáticamente. Agrega `FrameworkReference` en lugar de un `PackageReference`:

```xml
<!-- WinServices.Infrastructure/WinServices.Infrastructure.csproj -->
<ItemGroup>
  <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

> `FrameworkReference` no agrega peso al despliegue: los ensamblados viven en el runtime compartido
> del contenedor (`mcr.microsoft.com/dotnet/aspnet`) y no se copian a la carpeta `publish`.
> No genera advertencias NU1510 — solo los `PackageReference` redundantes con el framework las generan.

### Paso 4 — Registrar en Infrastructure DI

```csharp
// WinServices.Infrastructure/DependencyInjection.cs
public static IServiceCollection AddInfrastructure(
    this IServiceCollection services, IConfiguration configuration)
{
    // ...

    services.AddHttpContextAccessor();              // ← habilita IHttpContextAccessor
    services.AddScoped<IAuditContext, AuditContext>(); // ← enlaza interfaz con implementación

    // ...
    return services;
}
```

`AddHttpContextAccessor()` registra `IHttpContextAccessor` como singleton thread-safe que expone
el `HttpContext` del request activo. `AuditContext` es `Scoped` porque su vida útil es por request.

### Paso 5 — Usar en el servicio

El servicio inyecta `IAuditContext` y pasa sus valores al factory method de la entidad:

```csharp
// WinServices.Application/Services/ProductoService.cs
public sealed class ProductoService : IProductoService
{
    private readonly IProductoRepository _repository;
    private readonly IAuditContext       _auditContext;
    private readonly ILogger<ProductoService> _logger;

    public ProductoService(
        IProductoRepository repository,
        IAuditContext auditContext,
        ILogger<ProductoService> logger)
    {
        _repository   = repository;
        _auditContext = auditContext;
        _logger       = logger;
    }

    public async Task<Result<ProductoDto>> CrearProductoAsync(CrearProductoRequest request)
    {
        // ... validación ...

        var nuevo = Producto.Crear(
            request.DescNombre,
            request.MntPrecio,
            request.IdCategoria,
            _auditContext.UserId,    // ← del JWT claim
            _auditContext.HostName,  // ← Environment.MachineName
            _auditContext.AppName);  // ← "WinServices"

        await _repository.CrearProductoAsync(nuevo);
        return Result<ProductoDto>.Success(nuevo.ToDto());
    }
}
```

### Paso 6 — Factory method en la entidad

La entidad recibe los datos de auditoría como parámetros del factory method estático. El constructor
privado previene la creación directa y evita estados inválidos.

```csharp
// WinServices.Domain/Entities/Producto.cs
namespace WinServices.Domain.Entities;

public sealed class Producto
{
    public string IdProducto        { get; private set; } = default!;
    public string DescNombre        { get; private set; } = default!;
    public decimal MntPrecio        { get; private set; }
    public string IdCategoria       { get; private set; } = default!;
    public bool   FlgActivo         { get; private set; }

    // Auditoría de creación
    public string   DescUsuarioCrea { get; private set; } = default!;
    public string   DescHostCrea    { get; private set; } = default!;
    public DateTime FecCreacion     { get; private set; }
    public string   NomApp          { get; private set; } = default!;

    // Auditoría de modificación
    public string?   DescUsuarioModf { get; private set; }
    public string?   DescHostModf    { get; private set; }
    public DateTime? FecModf         { get; private set; }
    public string?   NomAppMod       { get; private set; }

    private Producto() { }  // Dapper usa este constructor para materializar resultados

    public static Producto Crear(
        string nombre, decimal precio, string idCategoria,
        string userId, string hostName, string appName)
    {
        return new Producto
        {
            IdProducto      = Guid.NewGuid().ToString(),
            DescNombre      = nombre,
            MntPrecio       = precio,
            IdCategoria     = idCategoria,
            FlgActivo       = true,
            DescUsuarioCrea = userId,
            DescHostCrea    = hostName,
            FecCreacion     = DateTime.UtcNow,
            NomApp          = appName
        };
    }

    public void Modificar(
        string nombre, decimal precio, string idCategoria,
        string userId, string hostName, string appName)
    {
        DescNombre      = nombre;
        MntPrecio       = precio;
        IdCategoria     = idCategoria;
        DescUsuarioModf = userId;
        DescHostModf    = hostName;
        FecModf         = DateTime.UtcNow;
        NomAppMod       = appName;
    }
}
```

> **¿Por qué `private Producto() {}`?** Dapper necesita un constructor sin parámetros accesible para
> materializar los resultados de las queries. El constructor privado basta — Dapper usa reflection
> y puede invocar constructores privados. El código de aplicación **no** puede usar `new Producto()`
> directamente, lo que fuerza el uso del factory method y garantiza invariantes.

### Paso 7 — SQL de la tabla con columnas de auditoría

```sql
CREATE TABLE t_productos (
    id_producto         VARCHAR(36)    NOT NULL PRIMARY KEY,
    desc_nombre         VARCHAR(100)   NOT NULL,
    mnt_precio          DECIMAL(10,2)  NOT NULL,
    id_categoria        VARCHAR(36)    NOT NULL,
    flg_activo          TINYINT(1)     NOT NULL DEFAULT 1,

    -- Auditoría creación
    desc_usuario_crea   VARCHAR(100)   NOT NULL,
    desc_host_crea      VARCHAR(100)   NOT NULL,
    fec_creacion        DATETIME       NOT NULL,
    nom_app             VARCHAR(50)    NOT NULL,

    -- Auditoría modificación
    desc_usuario_modf   VARCHAR(100)   NULL,
    desc_host_modf      VARCHAR(100)   NULL,
    fec_modf            DATETIME       NULL,
    nom_app_modf        VARCHAR(50)    NULL
);
```

### Mapperly — ignorar campos de auditoría en ToDto

`ProductoDto` no expone campos de auditoría (son internos). Mapperly lanza RMG020 si hay propiedades
en el origen sin equivalente en el destino. Suprímelas con `[MapperIgnoreSource]`:

```csharp
// WinServices.Application/Mapping/ProductoMapper.cs
using Riok.Mapperly.Abstractions;
using WinServices.Application.DTOs;
using WinServices.Domain.Entities;

namespace WinServices.Application.Mapping;

[Mapper]
public static partial class ProductoMapper
{
    [MapperIgnoreSource(nameof(Producto.DescUsuarioCrea))]
    [MapperIgnoreSource(nameof(Producto.DescHostCrea))]
    [MapperIgnoreSource(nameof(Producto.FecCreacion))]
    [MapperIgnoreSource(nameof(Producto.NomApp))]
    [MapperIgnoreSource(nameof(Producto.DescUsuarioModf))]
    [MapperIgnoreSource(nameof(Producto.DescHostModf))]
    [MapperIgnoreSource(nameof(Producto.FecModf))]
    [MapperIgnoreSource(nameof(Producto.NomAppMod))]
    public static partial ProductoDto ToDto(this Producto producto);

    public static partial IEnumerable<ProductoDto> ToDtoList(this IEnumerable<Producto> productos);
}
```

### IAuditContext en comunicación servicio a servicio

Cuando no hay usuario final (un servicio llama a otro), `HttpContext.User` no tiene claims de persona.
`AuditContext` debe resolverse a la identidad del servicio llamante. Hay tres escenarios según la
infraestructura que uses.

---

#### Escenario A — OAuth2 Client Credentials

Cada servicio obtiene su propio JWT usando el flujo `client_credentials` contra un Identity Provider
(Keycloak, Azure AD, etc.). El token lleva un claim `sub` con el ID del servicio.

```
Servicio A  →  Keycloak (client_credentials)  →  JWT { sub: "svc-inventario" }
Servicio A  →  Bearer JWT  →  Servicio B
```

`AuditContext` **no requiere cambios** — ya lee `sub` del token:

```csharp
UserId = user?.FindFirstValue(ClaimTypes.NameIdentifier)
      ?? user?.FindFirstValue("sub")   // ← "svc-inventario"
      ?? "anonymous";
```

La auditoría queda: `desc_usuario_crea = "svc-inventario"`.

> Es el escenario más robusto: el token tiene expiración, firma criptográfica y puede llevar scopes
> de autorización. Recomendado cuando ya tienes un Identity Provider en la infraestructura.

---

#### Escenario B — Red interna sin autenticación (header de propagación)

Servicios en red cerrada que no pasan token. El servicio llamante incluye un header con su identidad:

```http
X-Caller-Service: svc-inventario
```

`AuditContext` agrega el header como fallback:

```csharp
// WinServices.Infrastructure/Authentication/AuditContext.cs
public AuditContext(IHttpContextAccessor httpContextAccessor, IConfiguration configuration)
{
    var ctx  = httpContextAccessor.HttpContext;
    var user = ctx?.User;

    UserId = user?.FindFirstValue(ClaimTypes.NameIdentifier)
          ?? user?.FindFirstValue("sub")
          ?? ctx?.Request.Headers["X-Caller-Service"].FirstOrDefault()
          ?? "anonymous";

    HostName = Environment.MachineName;
    AppName  = configuration["AppName"] ?? "WinServices";
}
```

> Este header solo es confiable si la red interna **bloquea** que clientes externos lo inyecten.
> Si hay un gateway o balanceador de entrada, configúralo para eliminar `X-Caller-Service` en
> requests externos antes de que lleguen a los servicios internos.

---

#### Escenario C — API Key con Kong Gateway (patrón WIN)

Kong actúa como guardian antes del servicio destino. Valida la API Key del servicio llamante y,
después de validarla, **inyecta automáticamente** headers con la identidad del consumidor Kong:

```
Servicio A  →  Kong (valida API Key)  →  agrega headers  →  Servicio B
                                         X-Consumer-Username: svc-inventario
                                         X-Consumer-Custom-ID: svc-inventario
                                         X-Consumer-ID: 550e8400-...
```

Kong sobreescribe esos headers — el cliente externo no puede falsificarlos porque Kong los elimina
si vienen del cliente y los regenera con la identidad verificada.

`AuditContext` los lee como fallback:

```csharp
// WinServices.Infrastructure/Authentication/AuditContext.cs
public AuditContext(IHttpContextAccessor httpContextAccessor, IConfiguration configuration)
{
    var ctx  = httpContextAccessor.HttpContext;
    var user = ctx?.User;

    UserId = user?.FindFirstValue(ClaimTypes.NameIdentifier)
          ?? user?.FindFirstValue("sub")
          ?? ctx?.Request.Headers["X-Consumer-Username"].FirstOrDefault()
          ?? ctx?.Request.Headers["X-Consumer-Custom-ID"].FirstOrDefault()
          ?? "anonymous";

    HostName = Environment.MachineName;
    AppName  = configuration["AppName"] ?? "WinServices";
}
```

Si el nombre del header varía por entorno, externalízalo en `appsettings.json`:

```json
"Kong": {
  "ConsumerHeader": "X-Consumer-Username"
}
```

```csharp
var kongHeader = configuration["Kong:ConsumerHeader"] ?? "X-Consumer-Username";

UserId = user?.FindFirstValue(ClaimTypes.NameIdentifier)
      ?? user?.FindFirstValue("sub")
      ?? ctx?.Request.Headers[kongHeader].FirstOrDefault()
      ?? "anonymous";
```

> Los headers `X-Consumer-*` son estándar del plugin `key-auth` de Kong. Si tu organización usa
> un header personalizado, ajusta solo la clave de configuración — el resto del código no cambia.

---

#### Resumen de escenarios

| Infraestructura | UserId en auditoría | Cambios en AuditContext |
|---|---|---|
| JWT usuario final | Claim `sub` / `NameIdentifier` del JWT | Ninguno (comportamiento base) |
| OAuth2 Client Credentials | Claim `sub` del token de servicio | Ninguno |
| Red interna sin auth | Header `X-Caller-Service` | Agregar fallback al header |
| API Key con Kong | Header `X-Consumer-Username` (o `X-Consumer-Custom-ID`) | Agregar fallback al header de Kong |

En todos los casos el **servicio y la entidad no cambian** — solo varía cómo `AuditContext` resuelve
la identidad. El contrato `IAuditContext` es el mismo para todos los escenarios.

---

## Observabilidad: pipeline híbrido

La plantilla implementa un pipeline de observabilidad en dos canales paralelos:

| Canal | Tecnología | Ruta | Destino final |
|---|---|---|---|
| **Logs** (durable) | Serilog → RabbitMQ | AMQP | LogConsumer → OpenSearch Dashboards |
| **Trazas** (alta performance) | OTel SDK → OTLP/gRPC | gRPC | Jaeger v2 → OpenSearch + Jaeger UI :16686 |

Ambos canales son **opt-in por configuración**: si `RabbitMQ:Host` o `OpenTelemetry:OtlpEndpoint`
están vacíos, el sink / exporter no se activa. La API funciona sin infraestructura de observabilidad.

---

## Logging con Serilog

Serilog usa un logger mínimo de arranque en código (antes de leer appsettings) para capturar
errores tempranos del host. La configuración completa — sinks, niveles y enrich — vive en los
appsettings y se aplica en caliente al iniciar el host.

| Sink | Cuándo activo | Descripción |
|---|---|---|
| **Console** | Siempre | Output estructurado en terminal |
| **File** | Solo en Development | `logs/winservices.api-YYYYMMDD.log`, retención 7 días |
| **RabbitMQ** | Si `RabbitMQ:Host` tiene valor | Logs en JSON hacia el exchange `logs_exchange` (fanout, durable) |

### Configuración por entorno

**`appsettings.json`** — base de producción (nivel `Warning`, solo Console):

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Warning",
    "Override": {
      "Microsoft": "Warning",
      "System": "Warning"
    }
  },
  "WriteTo": [ { "Name": "Console" } ],
  "Enrich": [ "FromLogContext" ]
}
```

**`appsettings.Development.json`** — sobreescribe para desarrollo (nivel `Information`, Console + File):

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft": "Warning",
      "Microsoft.AspNetCore": "Warning",
      "System": "Warning"
    }
  },
  "WriteTo": [
    { "Name": "Console" },
    {
      "Name": "File",
      "Args": {
        "path": "logs/winservices.api-.log",
        "rollingInterval": "Day",
        "retainedFileCountLimit": 7
      }
    }
  ],
  "Enrich": [ "FromLogContext" ]
}
```

En producción los sinks (Seq, ELK, etc.) se configuran vía variables de entorno o un
`appsettings.Production.json` — sin tocar el código.

### Sink RabbitMQ (canal durable de logs)

El sink RabbitMQ se agrega por código en `Program.cs` y se activa automáticamente cuando
`RabbitMQ:Host` tiene valor. Lee el resto de parámetros desde `appsettings` / variables de entorno:

| Clave | Dev (`appsettings.Development.json`) | Producción (variable de entorno) |
|---|---|---|
| `RabbitMQ:Host` | `localhost` | `RabbitMQ__Host=broker.interno` |
| `RabbitMQ:Port` | `5672` | `RabbitMQ__Port=5672` |
| `RabbitMQ:Username` | `guest` | `RabbitMQ__Username=app_user` |
| `RabbitMQ:Password` | `guest` | `RabbitMQ__Password=secreto` |
| `RabbitMQ:LogsExchange` | `logs_exchange` | `RabbitMQ__LogsExchange=logs_exchange` |

El sink publica cada log como mensaje JSON persistente en un exchange `fanout`. El consumidor
(`LogConsumer.Worker`) recibe los mensajes y los indexa en OpenSearch via HTTP.

> El campo `TraceId` del contexto OTel se enriquece automáticamente en cada log cuando
> OpenTelemetry está activo, permitiendo correlacionar logs con trazas en OpenSearch.

### Usar el logger en un servicio

```csharp
public sealed class MiServicio
{
    private readonly ILogger<MiServicio> _logger;

    public MiServicio(ILogger<MiServicio> logger) => _logger = logger;

    public async Task EjecutarAsync()
    {
        _logger.LogInformation("Iniciando proceso para {Entidad}", "Tecnico");
        _logger.LogWarning("Registro no encontrado: ID {Id}", 42);
        _logger.LogError(ex, "Error inesperado al procesar {Contexto}", contexto);
    }
}
```

> Serilog captura automáticamente todas las propiedades nombradas `{Property}` como campos
> estructurados — no solo texto plano. Esto permite filtrar por campo en OpenSearch Dashboards.

### Agrupando Datos en el Campo "Context"

El formateador JSON nativo agrupa inteligentemente las variables bajo un objeto `"context": {}` para facilitar las consultas en OpenSearch. Tienes dos maneras de enviar estos datos:

**1. Log de mensaje único (Propiedad destructurada)**

Agrega el sufijo `{@Context}` al final de tu mensaje y pásale un objeto anónimo.

```csharp
_logger.LogInformation("Usuario modificado exitosamente. {@Context}", new 
{
    modulo = "Seguridad",
    accion = "Actualizar",
    usuarioId = 123
});
```

**2. Contexto de bloque continuo (LogContext)**

Si tienes múltiples operaciones y quieres que todos los logs compartan el mismo contexto, usa `LogContext.PushProperty` con el prefijo `Context.`:

```csharp
using (LogContext.PushProperty("Context.modulo", "Pagos"))
using (LogContext.PushProperty("Context.pasarela", "Stripe"))
{
    _logger.LogInformation("Iniciando validación de tarjeta..."); // Inyecta el context
    
    // ... mas código ...
    
    _logger.LogWarning("Fondos insuficientes"); // Inyecta el context también
}
```

Ambos métodos generarán este fragmento anidado en tu JSON de logs:

```json
"context": {
  "modulo": "Pagos",
  "pasarela": "Stripe"
}
```

---

## Trazas distribuidas con OpenTelemetry

OpenTelemetry (OTel) instrumenta la API automáticamente y exporta trazas a Jaeger vía OTLP/gRPC.
Jaeger almacena los spans en OpenSearch (`jaeger-span-indices`) y expone una UI en `:16686`.

```
.NET 10 API
  └── OTel SDK
        └── OTLP/gRPC ──→ Jaeger v2 ──→ jaeger-span-indices (OpenSearch)
                                    └──→ Jaeger UI :16686 (Gantt Charts & Service Map)
```

### Qué se instrumenta automáticamente

| Instrumentación | Qué captura |
|---|---|
| `AddAspNetCoreInstrumentation` | Cada request HTTP entrante (ruta, método, status, duración) |
| `AddHttpClientInstrumentation` | Cada llamada saliente de `HttpClient` / `RestSharp` |

### Configuración en appsettings

**`appsettings.json`** — vacío (OTel desactivado en producción si no se configura):

```json
"OpenTelemetry": {
  "ServiceName": "",
  "OtlpEndpoint": ""
}
```

**`appsettings.Development.json`** — valores de desarrollo:

```json
"OpenTelemetry": {
  "ServiceName": "WinServices.Api",
  "OtlpEndpoint": "http://jaeger:4317"
}
```

En producción inyecta vía variables de entorno:

```bash
OpenTelemetry__ServiceName=WinServices.Api
OpenTelemetry__OtlpEndpoint=http://jaeger:4317
```

### Cómo funciona el código en `Program.cs`

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService(serviceName))   // identifica el servicio en Jaeger
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation()
               .AddHttpClientInstrumentation();

        if (!string.IsNullOrWhiteSpace(otlpEndpoint))    // solo si está configurado
            tracing.AddOtlpExporter(opts =>
                opts.Endpoint = new Uri(otlpEndpoint));
    });
```

Si `OtlpEndpoint` está vacío, OTel sigue funcionando internamente (instrumentación activa)
pero no exporta spans — útil para pruebas unitarias sin Jaeger.

### Correlación logs ↔ trazas

Cuando OTel está activo, el `TraceId` del span actual se propaga al contexto de Serilog.
Configura el enrich en `appsettings.Development.json` para incluirlo en cada log:

```json
"Enrich": [ "FromLogContext" ]
```

Con esto, cada línea de log lleva el mismo `TraceId` que la traza en Jaeger, permitiendo
navegar entre ambos en OpenSearch Dashboards.

---

## Validación con FluentValidation

FluentValidation permite definir reglas de validación de forma declarativa, separadas del modelo y del
servicio. Cada validador es una clase independiente que hereda de `AbstractValidator<T>`. Se detectan y
registran automáticamente en DI, por lo que basta con crear el archivo — sin registro manual.

### Reglas comunes

```csharp
RuleFor(x => x.Nombre)
    .NotEmpty()
    .MaximumLength(100)
    .Matches("^[a-zA-Z ]+$").WithMessage("Solo letras.");

RuleFor(x => x.Celular)
    .NotEmpty()
    .Length(9)
    .Must(c => c.StartsWith("9")).WithMessage("Debe comenzar con 9.");

RuleFor(x => x.Email)
    .NotEmpty()
    .EmailAddress();

RuleFor(x => x.Imei)
    .NotEmpty()
    .Length(15)
    .Matches("^[0-9]+$");
```

### Validación condicional

```csharp
RuleFor(x => x.Imei2)
    .Length(15)
    .Matches("^[0-9]+$")
    .When(x => x.Imei2 is not null);
```

### Retornar errores desde el servicio

```csharp
var validation = await _validator.ValidateAsync(request, ct);
if (!validation.IsValid)
{
    var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
    return Result<MiDto>.Failure(errors);
}
```

---

## Mapeo con Mapperly

Mapperly genera código de mapeo en tiempo de compilación — cero reflection, máximo rendimiento.

### Mapeo simple (propiedades con el mismo nombre)

```csharp
[Mapper]
public static partial class MiMapper
{
    public static partial MiDto ToDto(this MiEntidad entidad);
    public static partial IEnumerable<MiDto> ToDtoList(this IEnumerable<MiEntidad> entidades);
}

// Uso:
var dto = entidad.ToDto();
var dtos = entidades.ToDtoList();
```

### Mapeo con propiedades de nombre diferente

```csharp
[Mapper]
public static partial class TecnicoMapper
{
    [MapProperty(nameof(Tecnico.NroDocumento), nameof(TecnicoDto.NumeroDocumento))]
    public static partial TecnicoDto ToDto(this Tecnico tecnico);
}
```

### Ignorar propiedades

```csharp
[MapperIgnoreTarget(nameof(TecnicoDto.PasswordHash))]
public static partial TecnicoDto ToDto(this Tecnico tecnico);
```

---

## Stored Procedures con Dapper

Dapper soporta stored procedures pasando `CommandType.StoredProcedure` a cualquier método de consulta.
Usa `DynamicParameters` cuando necesites parámetros de salida (`OUTPUT`) o retorno de valores calculados
en el servidor.

### Llamado básico a SP

```csharp
using var conn = ConnectionFactory.CreateConnection();
var resultados = await conn.QueryAsync<MiEntidad>(
    "sp_NombreProcedimiento",
    new { Param1 = valor1, Param2 = valor2 },
    commandType: CommandType.StoredProcedure);
```

### SP con parámetro de salida

```csharp
var parameters = new DynamicParameters();
parameters.Add("@p_Input", valor);
parameters.Add("@p_Output", dbType: DbType.Int32, direction: ParameterDirection.Output);

await conn.ExecuteAsync("sp_MiSP", parameters, commandType: CommandType.StoredProcedure);
var resultado = parameters.Get<int>("@p_Output");
```

### SP dentro de una transacción

```csharp
using var conn = ConnectionFactory.CreateConnection();
conn.Open();
using var tx = conn.BeginTransaction();
try
{
    await conn.ExecuteAsync("sp_Insertar", new { ... }, transaction: tx,
        commandType: CommandType.StoredProcedure);
    await conn.ExecuteAsync("sp_Auditar", new { ... }, transaction: tx,
        commandType: CommandType.StoredProcedure);
    tx.Commit();
}
catch
{
    tx.Rollback();
    throw;
}
```

---

## Relaciones entre entidades (Dapper multi-mapping)

Dapper no gestiona relaciones automáticamente como EF Core. Las dos estrategias principales son
**multi-mapping** (un JOIN + mapeo en memoria) y **dos queries** (recomendada para colecciones grandes).

### One-to-Many: Empresa → Técnicos

#### Entidades de dominio

```csharp
// Domain/Entities/Empresa.cs
public sealed class Empresa : BaseEntity
{
    public string RazonSocial { get; private set; } = default!;
    public string Ruc         { get; private set; } = default!;

    private readonly List<Tecnico> _tecnicos = [];
    public IReadOnlyList<Tecnico> Tecnicos => _tecnicos.AsReadOnly();

    private Empresa() { }

    public static Empresa Create(string razonSocial, string ruc) =>
        new() { RazonSocial = razonSocial, Ruc = ruc };

    public void AddTecnico(Tecnico tecnico) => _tecnicos.Add(tecnico);
}

// Domain/Entities/Tecnico.cs
public sealed class Tecnico : BaseEntity
{
    public string  Nombres   { get; private set; } = default!;
    public string  Apellidos { get; private set; } = default!;
    public int     EmpresaId { get; private set; }
    public Empresa? Empresa  { get; private set; }  // navegación, solo para lectura

    private Tecnico() { }

    public static Tecnico Create(string nombres, string apellidos, int empresaId) =>
        new() { Nombres = nombres, Apellidos = apellidos, EmpresaId = empresaId };
}
```

#### SQL

```sql
CREATE TABLE Empresas (
    Id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    RazonSocial VARCHAR(100) NOT NULL,
    Ruc        VARCHAR(11)  NOT NULL UNIQUE,
    CreatedAt  DATETIME     NOT NULL,
    UpdatedAt  DATETIME     NULL
);

CREATE TABLE Tecnicos (
    Id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Nombres    VARCHAR(50) NOT NULL,
    Apellidos  VARCHAR(50) NOT NULL,
    EmpresaId  INT         NOT NULL,
    CreatedAt  DATETIME    NOT NULL,
    UpdatedAt  DATETIME    NULL,
    FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id)
);
```

#### Repositorio — opción A: dos queries (recomendada)

Evita registros duplicados del padre y es más eficiente en grandes volúmenes.

```csharp
public async Task<IEnumerable<Empresa>> GetAllConTecnicosAsync(CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();

    var empresas = (await conn.QueryAsync<Empresa>("SELECT * FROM Empresas ORDER BY RazonSocial")).ToList();

    if (!empresas.Any()) return empresas;

    var tecnicos = await conn.QueryAsync<Tecnico>(
        "SELECT * FROM Tecnicos WHERE EmpresaId IN @Ids",
        new { Ids = empresas.Select(e => e.Id) });

    var lookup = empresas.ToDictionary(e => e.Id);
    foreach (var tecnico in tecnicos)
    {
        if (lookup.TryGetValue(tecnico.EmpresaId, out var empresa))
        {
            empresa.AddTecnico(tecnico);
        }
    }

    return empresas;
}
```

#### Repositorio — opción B: JOIN con multi-mapping

Útil para cargar una sola empresa con sus técnicos en una query.

```csharp
public async Task<Empresa?> GetConTecnicosAsync(int id, CancellationToken ct = default)
{
    using var conn = ConnectionFactory.CreateConnection();
    Empresa? empresa = null;

    await conn.QueryAsync<Empresa, Tecnico, Empresa>(
        @"SELECT e.Id, e.RazonSocial, e.Ruc, e.CreatedAt,
                 t.Id AS TecnicoId, t.Nombres, t.Apellidos, t.EmpresaId, t.CreatedAt
          FROM   Empresas e
          LEFT   JOIN Tecnicos t ON t.EmpresaId = e.Id
          WHERE  e.Id = @Id",
        (emp, tecnico) =>
        {
            empresa ??= emp;
            if (tecnico is not null)
                empresa.AddTecnico(tecnico);
            return empresa;
        },
        new { Id = id },
        splitOn: "TecnicoId");   // Dapper divide al encontrar esta columna

    return empresa;
}
```

> `splitOn` indica el nombre de la columna que marca el inicio del segundo tipo.
> Aliasa el `Id` del hijo (`t.Id AS TecnicoId`) para que Dapper pueda distinguirlo.

---

### Many-to-Many: Técnico ↔ Servicio

#### Entidades y tabla pivote

```csharp
// Domain/Entities/Servicio.cs
public sealed class Servicio : BaseEntity
{
    public string Nombre      { get; private set; } = default!;
    public string Descripcion { get; private set; } = default!;

    private Servicio() { }
    public static Servicio Create(string nombre, string descripcion) =>
        new() { Nombre = nombre, Descripcion = descripcion };
}
```

```sql
CREATE TABLE Servicios (
    Id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NULL,
    CreatedAt   DATETIME     NOT NULL,
    UpdatedAt   DATETIME     NULL
);

CREATE TABLE TecnicoServicios (
    TecnicoId  INT NOT NULL,
    ServicioId INT NOT NULL,
    PRIMARY KEY (TecnicoId, ServicioId),
    FOREIGN KEY (TecnicoId)  REFERENCES Tecnicos(Id),
    FOREIGN KEY (ServicioId) REFERENCES Servicios(Id)
);
```

#### Consulta many-to-many

```csharp
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

---

## Middleware

El middleware intercepta cada request/response antes y después de los controllers.
Se registra en `Program.cs` con `app.UseMiddleware<T>()`.

### Middleware de manejo global de errores

```csharp
// WinServices.Api/Middleware/GlobalExceptionMiddleware.cs
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no manejado en {Path}", context.Request.Path);

            context.Response.StatusCode  = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsJsonAsync(new
            {
                error   = "Ha ocurrido un error interno.",
                traceId = context.TraceIdentifier
            });
        }
    }
}
```

### Middleware de métricas de request

```csharp
// WinServices.Api/Middleware/RequestTimingMiddleware.cs
public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        sw.Stop();

        _logger.LogInformation(
            "{Method} {Path} completó en {ElapsedMs}ms",
            context.Request.Method,
            context.Request.Path,
            sw.ElapsedMilliseconds);
    }
}
```

### Registrar middleware en Program.cs

```csharp
// El orden importa — se ejecutan en cadena de arriba a abajo
app.UseMiddleware<GlobalExceptionMiddleware>(); // primero: captura errores de todo lo que sigue
app.UseMiddleware<RequestTimingMiddleware>();
app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

---

## Filtros de API (Action Filters)

Los filtros se ejecutan antes o después de un action específico. A diferencia del middleware,
tienen acceso al contexto de MVC (modelo, resultado, atributos del action).

### Filtro de validación de modelo

```csharp
// WinServices.Api/Filters/ValidationFilter.cs
public sealed class ValidationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage);

            context.Result = new BadRequestObjectResult(new { errors });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

### Filtro de logging por action

```csharp
// WinServices.Api/Filters/AuditFilter.cs
public sealed class AuditFilter : IActionFilter
{
    private readonly ILogger<AuditFilter> _logger;

    public AuditFilter(ILogger<AuditFilter> logger) => _logger = logger;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        _logger.LogInformation(
            "Ejecutando {Controller}.{Action} con argumentos {@Arguments}",
            context.RouteData.Values["controller"],
            context.RouteData.Values["action"],
            context.ActionArguments);
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.Exception is not null)
            _logger.LogError(context.Exception,
                "Error en {Controller}.{Action}",
                context.RouteData.Values["controller"],
                context.RouteData.Values["action"]);
    }
}
```

### Registrar filtros

```csharp
// Global — aplica a todos los controllers
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();
    options.Filters.Add<AuditFilter>();
});

// Por controller o action
[ServiceFilter(typeof(AuditFilter))]
public sealed class TecnicosController : ControllerBase { }
```

> Registra filtros que usan DI con `builder.Services.AddScoped<AuditFilter>()` y úsalos
> con `[ServiceFilter(typeof(AuditFilter))]`. Los filtros sin DI pueden usarse con `[TypeFilter]`.

---

## Autenticación

La plantilla incluye autenticación JWT. El flujo completo es:

```
POST /api/auth/login → valida credenciales → genera JWT → cliente lo envía en cada request
Authorization: Bearer <token>
```

### Generar JWT desde un servicio

```csharp
// Inyecta IJwtProvider (ya registrado en Infrastructure)
public sealed class AuthService
{
    private readonly IJwtProvider _jwtProvider;
    private readonly IPasswordHasher _hasher;

    public async Task<Result<string>> LoginAsync(string email, string password)
    {
        var usuario = await _repo.GetByEmailAsync(email);
        if (usuario is null || !_hasher.Verify(password, usuario.PasswordHash))
            return Result<string>.Failure("Credenciales incorrectas.");

        var token = _jwtProvider.GenerateToken(usuario.Id, usuario.Email, usuario.Rol);
        return Result<string>.Success(token);
    }
}
```

### Controller de autenticación

```csharp
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (!result.IsSuccess) return Unauthorized(new { error = result.Error });
        return Ok(new { accessToken = result.Value });
    }
}

public sealed record LoginRequest(string Email, string Password);
```

### Leer claims del usuario en un controller

```csharp
// ControllerBase expone User (ClaimsPrincipal) en todo controller autenticado
var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
var email  = User.FindFirstValue(ClaimTypes.Email)!;
var rol    = User.FindFirstValue(ClaimTypes.Role)!;
```

### Hashing de contraseñas

```csharp
// Inyecta IPasswordHasher (ya registrado en Infrastructure)
var hash     = _hasher.Hash("mi-contraseña");       // al crear usuario
var esValido = _hasher.Verify("mi-contraseña", hash); // al hacer login
```

---

## Autorización

La autorización controla **qué puede hacer** un usuario ya autenticado. La plantilla soporta dos enfoques:
autorización por **rol** (simple, basada en el claim `ClaimTypes.Role` del JWT) y por **política** (más
flexible, permite combinar roles, claims y lógica personalizada). Ambos se configuran con atributos en
los controllers o actions.

### Por rol

```csharp
[Authorize(Roles = "Admin")]             // solo admins
[Authorize(Roles = "Admin,Supervisor")]  // admin O supervisor
[AllowAnonymous]                         // sin autenticación
```

### Por política (Policy-based)

Más flexible que roles — combina claims, roles y lógica custom.

```csharp
// Program.cs — definir políticas
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SoloAdmins", policy =>
        policy.RequireRole("Admin"));

    options.AddPolicy("PuedeEditarTecnicos", policy =>
        policy.RequireRole("Admin", "Supervisor"));

    options.AddPolicy("EmpresaActiva", policy =>
        policy.RequireClaim("empresa_estado", "activa"));
});

// Controller — usar política
[Authorize(Policy = "PuedeEditarTecnicos")]
[HttpPut("{id:int}")]
public async Task<IActionResult> Update(int id, ...) { ... }
```

### Endpoint público dentro de controller protegido

```csharp
[ApiController]
[Route("api/tecnicos")]
[Authorize]                      // protege todo el controller
public sealed class TecnicosController : ControllerBase
{
    [AllowAnonymous]             // este endpoint es público
    [HttpGet("ping")]
    public IActionResult Ping() => Ok("pong");

    [HttpGet]                    // requiere autenticación (hereda del controller)
    public async Task<IActionResult> GetAll(CancellationToken ct) { ... }

    [Authorize(Roles = "Admin")] // requiere rol específico (sobreescribe el del controller)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { ... }
}
```

### Agregar claims al token JWT

```csharp
// Infrastructure/Authentication/JwtProvider.cs
var claims = new[]
{
    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
    new Claim(ClaimTypes.Email, email),
    new Claim(ClaimTypes.Role, role),
    new Claim("empresa_id", empresaId.ToString()),     // claim custom
    new Claim("empresa_estado", empresaEstado)          // claim custom
};
```

---

## Habilitar / deshabilitar JWT

Útil durante el desarrollo para probar endpoints sin generar tokens, o para exponer una API pública.
El secreto JWT **nunca** debe ir en `appsettings.json` en producción — usa variables de entorno.

### Deshabilitar (API pública temporal)

En `Program.cs` comenta o elimina:
```csharp
builder.Services.AddAuthentication(...)
builder.Services.AddAuthorization();
app.UseAuthentication();
app.UseAuthorization();
```

Y en los controllers elimina `[Authorize]`.

### Habilitar en producción

Configura en variables de entorno (nunca en `appsettings.json`):
```
JwtSettings__Secret=tu_clave_secreta_de_32_caracteres_minimo
```

---

## Consumo de APIs externas con RestSharp

La plantilla incluye `HttpServiceBase` en Infrastructure como base para crear clientes HTTP.
El patrón es idéntico al de `BaseRepository`: hereda la clase base y agrega los métodos
específicos de la API que necesitas consumir.

### Estructura

```
Infrastructure/
└── Http/
    ├── HttpServiceBase.cs      ← base abstracta (GET, POST, PUT, DELETE)
    └── ExampleHttpService.cs   ← ejemplo concreto
```

### Crear un cliente para una API externa

**1. Crea el servicio en `Infrastructure/Http/`:**

```csharp
// WinServices.Infrastructure/Http/FacturacionHttpService.cs
namespace WinServices.Infrastructure.Http;

public sealed class FacturacionHttpService : HttpServiceBase
{
    public FacturacionHttpService(string baseUrl) : base(baseUrl) { }

    public async Task<FacturaDto?> GetFacturaAsync(int id, CancellationToken ct = default)
        => await GetAsync<FacturaDto>($"facturas/{id}", ct);

    public async Task<FacturaDto?> CrearFacturaAsync(CrearFacturaRequest request, CancellationToken ct = default)
        => await PostAsync<CrearFacturaRequest, FacturaDto>("facturas", request, ct);
}
```

**2. Registra en `Infrastructure/DependencyInjection.cs`:**

```csharp
var facturacionUrl = configuration["ExternalServices:Facturacion:BaseUrl"]
    ?? throw new InvalidOperationException("ExternalServices:Facturacion:BaseUrl no configurado.");

services.AddScoped<FacturacionHttpService>(_ => new FacturacionHttpService(facturacionUrl));
```

**3. Agrega la URL en `appsettings.json`:**

```json
"ExternalServices": {
  "Facturacion": {
    "BaseUrl": "https://api.facturacion.com/v1"
  }
}
```

**4. Inyecta en el servicio de aplicación que lo necesite:**

```csharp
public sealed class PedidoService : IPedidoService
{
    private readonly IPedidoRepository _repo;
    private readonly FacturacionHttpService _facturacion;

    public PedidoService(IPedidoRepository repo, FacturacionHttpService facturacion)
    {
        _repo         = repo;
        _facturacion  = facturacion;
    }

    public async Task<Result<PedidoDto>> ProcesarAsync(int pedidoId, CancellationToken ct = default)
    {
        var pedido   = await _repo.GetByIdAsync(pedidoId, ct);
        var factura  = await _facturacion.CrearFacturaAsync(new CrearFacturaRequest(pedido!), ct);
        // ...
    }
}
```

### Autenticación con la API externa

#### API Key como header fijo

```csharp
public sealed class ProveedorHttpService : HttpServiceBase
{
    public ProveedorHttpService(string baseUrl, string apiKey) : base(baseUrl)
    {
        AddDefaultHeader("X-Api-Key", apiKey);
    }
}

// DependencyInjection.cs:
var apiKey = configuration["ExternalServices:Proveedor:ApiKey"]
    ?? throw new InvalidOperationException("ExternalServices:Proveedor:ApiKey no configurado.");

services.AddScoped<ProveedorHttpService>(_ => new ProveedorHttpService(baseUrl, apiKey));
```

#### Bearer token fijo (token de servicio, no de usuario)

```csharp
public sealed class ReportesHttpService : HttpServiceBase
{
    public ReportesHttpService(string baseUrl, string token) : base(baseUrl)
    {
        SetBearerToken(token);
    }
}
```

#### Bearer token dinámico (token del usuario autenticado)

Cuando el token varía por request (el JWT del usuario), no lo fijes en el constructor.
Pásalo desde el servicio de aplicación:

```csharp
// En HttpServiceBase hay acceso al RestClient vía constructor con RestClientOptions.
// La forma más simple: agrégalo como parámetro del método.

public async Task<ReporteDto?> GetReporteAsync(int id, string bearerToken, CancellationToken ct = default)
{
    var request = new RestRequest($"reportes/{id}");
    request.AddHeader("Authorization", $"Bearer {bearerToken}");
    // Para este caso accede directamente al cliente con RestClientOptions desde el constructor base.
}
```

### Métodos disponibles en HttpServiceBase

| Método | HTTP | Descripción |
|---|---|---|
| `GetAsync<T>(resource)` | GET | Obtiene y deserializa la respuesta en `T` |
| `PostAsync<TReq, TRes>(resource, body)` | POST | Envía body JSON, deserializa respuesta |
| `PutAsync<TReq, TRes>(resource, body)` | PUT | Actualiza recurso, deserializa respuesta |
| `DeleteAsync(resource)` | DELETE | Elimina recurso, sin respuesta |
| `AddDefaultHeader(name, value)` | — | Header fijo para todos los requests |
| `SetBearerToken(token)` | — | Bearer fijo para todos los requests |

---

## Circuit Breaker con Polly

El circuit breaker protege la aplicación cuando una API externa falla repetidamente: después de N errores
consecutivos, "abre el circuito" y rechaza llamadas durante un tiempo sin intentar el request (fail fast).
La plantilla integra Polly v8 en `HttpServiceBase` — basta con construir un `ResiliencePipeline` y
pasarlo al constructor del cliente HTTP.

### Configurar un pipeline con retry + circuit breaker

```csharp
// WinServices.Infrastructure/DependencyInjection.cs
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

var pipeline = new ResiliencePipelineBuilder()
    // 1. Retry: 3 intentos con backoff exponencial (200ms → 400ms → 800ms)
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        Delay            = TimeSpan.FromMilliseconds(200),
        BackoffType      = DelayBackoffType.Exponential,
        OnRetry          = args =>
        {
            // logger aquí si tienes acceso a ILogger en DI
            return default;
        }
    })
    // 2. Circuit breaker: abre si el 50% de las últimas 10 llamadas fallan
    //    Se mantiene abierto 15 segundos antes de pasar a half-open
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio      = 0.5,
        SamplingDuration  = TimeSpan.FromSeconds(30),
        MinimumThroughput = 5,
        BreakDuration     = TimeSpan.FromSeconds(15)
    })
    .Build();

// Pasar el pipeline al cliente HTTP concreto
var url = configuration["ExternalServices:Facturacion:BaseUrl"]!;
services.AddScoped<FacturacionHttpService>(_ => new FacturacionHttpService(url, pipeline));
```

### Estados del circuit breaker

| Estado | Descripción |
|---|---|
| **Closed** | Normal — todas las llamadas pasan |
| **Open** | Falla detectada — rechaza llamadas sin intentarlas (lanza `BrokenCircuitException`) |
| **Half-Open** | Prueba — deja pasar una llamada de prueba para ver si el servicio se recuperó |

### Atrapar el circuito abierto en el servicio

```csharp
using Polly.CircuitBreaker;

public async Task<Result<FacturaDto>> ObtenerFacturaAsync(int id, CancellationToken ct = default)
{
    try
    {
        var factura = await _facturacion.GetAsync<FacturaDto>($"facturas/{id}", ct);
        return factura is null
            ? Result<FacturaDto>.Failure("Factura no encontrada.")
            : Result<FacturaDto>.Success(factura);
    }
    catch (BrokenCircuitException)
    {
        _logger.LogWarning("Servicio de facturación no disponible (circuit breaker abierto)");
        return Result<FacturaDto>.Failure("Servicio de facturación temporalmente no disponible.");
    }
}
```

> El retry se ejecuta **antes** que el circuit breaker en el pipeline — los reintentos cuentan
> como intentos en la ventana de muestreo del circuit breaker.

---

## Mensajería asíncrona con RabbitMQ

RabbitMQ desacopla productores y consumidores: el servicio publica un mensaje y continúa sin esperar
que el consumidor lo procese. Útil para tareas en background (notificaciones, activaciones, reportes)
y para absorber picos de carga.

### Conceptos clave

| Concepto | Descripción |
|---|---|
| **Exchange** | Punto de entrada de mensajes. Distribuye a colas según la routing key |
| **Queue** | Buffer persistente de mensajes |
| **Routing Key** | Criterio de enrutamiento del exchange a la cola |
| **ACK / NACK** | Confirmación de procesamiento exitoso / fallido |

### Configurar la conexión

`appsettings.json` ya tiene la sección `RabbitMQ` con valores por defecto (localhost/guest).
Sobreescríbelos en `appsettings.Development.json` si tu entorno local usa valores distintos:

```json
"RabbitMQ": {
  "Host":        "localhost",
  "Port":        "5672",
  "Username":    "guest",
  "Password":    "guest",
  "VirtualHost": "/"
}
```

En producción usa variables de entorno:
```bash
RabbitMQ__Host=rabbitmq.miservidor.com
RabbitMQ__Username=app_user
RabbitMQ__Password=secret
```

### Activar en `Infrastructure/DependencyInjection.cs`

Descomenta el bloque RabbitMQ ya incluido en el archivo. El patrón es:
- `IConnection` como **Singleton** — reutiliza el socket TCP
- `IMessageBus` (→ `RabbitMqMessageBus`) como **Scoped** — un canal por request

### Publicar un mensaje desde un servicio

```csharp
// WinServices.Application/Services/InstalacionService.cs
public sealed class InstalacionService : IInstalacionService
{
    private readonly IInstalacionRepository _repo;
    private readonly IMessageBus _bus;

    public InstalacionService(IInstalacionRepository repo, IMessageBus bus)
    {
        _repo = repo;
        _bus  = bus;
    }

    public async Task<Result> CompletarInstalacionAsync(int id, CancellationToken ct = default)
    {
        var instalacion = await _repo.GetByIdAsync(id, ct);
        if (instalacion is null)
            return Result.Failure("Instalación no encontrada.");

        await _repo.MarcarCompletadaAsync(id, ct);

        // Publicar evento para que el consumidor active los servicios (Internet, Fonowin, etc.)
        await _bus.PublishAsync(
            exchange:   "",                          // default exchange
            routingKey: "activaciones",              // = nombre de la cola
            message:    new ActivacionEvent(id, instalacion.TecnicoId, DateTime.UtcNow),
            ct:         ct);

        return Result.Success();
    }
}

// Application/DTOs o Domain/Events:
public sealed record ActivacionEvent(int InstalacionId, int TecnicoId, DateTime FechaEvento);
```

### Crear un consumidor

```csharp
// WinServices.Infrastructure/Messaging/ActivacionConsumer.cs
using System.Text.Json;

public sealed class ActivacionConsumer : RabbitMqConsumerBase
{
    private readonly IServiceScopeFactory _scopeFactory;

    public ActivacionConsumer(
        IConnection connection,
        ILogger<ActivacionConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(connection, logger)
    {
        _scopeFactory = scopeFactory;
    }

    protected override string QueueName => "activaciones";

    // Opcional: sobreescribe para declarar dead-letter queue, TTL, etc.
    protected override async Task ConfigureQueueAsync(IChannel channel, CancellationToken ct)
    {
        await channel.QueueDeclareAsync(
            queue:     QueueName,
            durable:   true,
            exclusive: false,
            autoDelete: false,
            arguments: new Dictionary<string, object?>
            {
                ["x-dead-letter-exchange"]    = "",
                ["x-dead-letter-routing-key"] = "activaciones.dlq"
            },
            cancellationToken: ct);
    }

    protected override async Task HandleAsync(string message, CancellationToken ct)
    {
        var evento = JsonSerializer.Deserialize<ActivacionEvent>(message)!;

        // Usa un scope para inyectar servicios Scoped dentro de un Singleton (hosted service)
        await using var scope   = _scopeFactory.CreateAsyncScope();
        var activacionService   = scope.ServiceProvider.GetRequiredService<IActivacionService>();
        await activacionService.ActivarServiciosAsync(evento.InstalacionId, ct);
    }
}
```

### Registrar el consumidor como hosted service

```csharp
// Program.cs
builder.Services.AddHostedService<ActivacionConsumer>();
```

> Los consumidores son `BackgroundService` — se inician con la app y detienen al apagarla.
> Usan **manual ACK** (`autoAck: false`): si el proceso muere antes del ACK, RabbitMQ reencola.

---

## Health Checks

Los health checks exponen el estado de la aplicación en un endpoint HTTP público.
Por defecto `/health` responde `Healthy` sin verificar ninguna dependencia externa —
es un "estoy vivo" básico. Los checks de BD, Redis y RabbitMQ son opcionales:
se habilitan descomentando una línea en `DependencyInjection.cs` junto con su feature.

### Endpoint

```
GET http://localhost:5000/health
```

No requiere token JWT. Respuesta por defecto (sin checks configurados):

```json
{
  "status": "Healthy",
  "duration": 0.12,
  "checks": []
}
```

Los valores posibles de `status` son `Healthy`, `Degraded` y `Unhealthy`.

### Agregar check de base de datos

Descomenta en `Infrastructure/DependencyInjection.cs`:

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["db"]);  // ← descomenta
```

Respuesta:

```json
{
  "status": "Healthy",
  "duration": 11.40,
  "checks": [
    { "name": "database", "status": "Healthy", "description": "Base de datos disponible.", "duration": 11.20, "tags": ["db"] }
  ]
}
```

### Agregar check de Redis

Descomenta **junto con** el bloque de activación de Redis:

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["db"])   // si BD activa
    .AddCheck<RedisHealthCheck>("redis",        tags: ["cache"]);  // ← descomenta
```

### Agregar check de RabbitMQ

Descomenta **junto con** el bloque de activación de RabbitMQ:

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database",  tags: ["db"])
    .AddCheck<RedisHealthCheck>("redis",         tags: ["cache"])
    .AddCheck<RabbitMqHealthCheck>("rabbitmq",   tags: ["messaging"]);  // ← descomenta
```

### Agregar un check personalizado

Crea una clase en `Infrastructure/HealthChecks/` que implemente `IHealthCheck`:

```csharp
// Infrastructure/HealthChecks/ApiExternaHealthCheck.cs
public sealed class ApiExternaHealthCheck : IHealthCheck
{
    private readonly MiApiHttpService _api;

    public ApiExternaHealthCheck(MiApiHttpService api) => _api = api;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            var result = await _api.GetAsync<object>("ping", ct);
            return HealthCheckResult.Healthy("API externa disponible.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("API externa no disponible.", ex);
        }
    }
}
```

Registra en `DependencyInjection.cs`:

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database",         tags: ["db"])
    .AddCheck<ApiExternaHealthCheck>("api-externa",    tags: ["external"]);
```

### Filtrar checks por tag

Si quieres endpoints separados (ej. liveness vs. readiness):

```csharp
// /health/live — solo verifica que el proceso responde (sin checks de infra)
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false   // ningún check, solo status 200
}).AllowAnonymous();

// /health/ready — verifica todas las dependencias
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("db")
                      || check.Tags.Contains("cache")
                      || check.Tags.Contains("messaging")
}).AllowAnonymous();
```

> **Kubernetes**: usa `/health/live` en `livenessProbe` y `/health/ready` en `readinessProbe`.

---

## Cambiar proveedor de base de datos

Por defecto usa **MySQL** vía `MySqlConnector`. Para cambiar:

### PostgreSQL

1. En `WinServices.Infrastructure.csproj` reemplaza `MySqlConnector` por `Npgsql`.
2. En `DbConnectionFactory.cs`:
   ```csharp
   return new NpgsqlConnection(_connectionString);
   ```
3. En los repositorios, `SELECT LAST_INSERT_ID()` → `RETURNING Id` o `SELECT lastval()`.

### SQL Server

1. Paquete: `Microsoft.Data.SqlClient`
2. Conexión: `new SqlConnection(_connectionString)`
3. Last insert: `SELECT SCOPE_IDENTITY()`

---

## Múltiples conexiones a base de datos

Cuando la aplicación necesita conectarse a más de una base de datos (por ejemplo, la BD operacional y una
BD de reportes de solo lectura), se registran varias instancias de `IDbConnectionFactory`. Hay dos formas
de distinguirlas en DI: interfaces derivadas (compatible con cualquier versión de .NET) o Keyed Services
(.NET 8+, más conciso).

### 1. Configurar las cadenas de conexión

Las cadenas de conexión varían según el motor de base de datos. Aquí tienes ejemplos comunes:

| Motor | Formato de Cadena de Conexión (con puerto) |
|---|---|
| **MySQL** | `Server=localhost;Port=3306;Database=mydb;Uid=root;Pwd=password;` |
| **PostgreSQL** | `Host=localhost;Port=5432;Database=mydb;Username=postgres;Password=password;` |
| **SQL Server** | `Server=localhost,1433;Database=mydb;User Id=sa;Password=password;TrustServerCertificate=True;` |

#### ¿Dónde configurar las cadenas?

No te limites a `appsettings.json`. Dependiendo del entorno, debes usar diferentes fuentes para mayor seguridad:

1.  **`appsettings.json` / `appsettings.Development.json`**: Solo para valores por defecto o desarrollo local no sensible.
2.  **Secret Manager (`dotnet user-secrets`)**: Recomendado para desarrollo local. Evita subir credenciales al repositorio.
    ```bash
    dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=..."
    ```
3.  **Variables de Entorno**: Ideal para Docker, Kubernetes o CI/CD.
    ```bash
    ConnectionStrings__DefaultConnection="Server=..."
    ```
4.  **Azure Key Vault / AWS Secrets Manager**: Recomendado para producción en la nube. Proporciona máxima seguridad y rotación de secretos.

En `appsettings.json` la estructura base es:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=win_services;Uid=root;Pwd=root;",
  "ReportsConnection": "Server=localhost;Database=win_reports;Uid=root;Pwd=root;"
}
```

### 2. Registrar en Program.cs

#### Opción A — Interfaces derivadas (compatible con cualquier versión de .NET)

```csharp
// IReportsDbConnectionFactory.cs
public interface IReportsDbConnectionFactory : IDbConnectionFactory { }

// ReportsDbConnectionFactory.cs
public sealed class ReportsDbConnectionFactory : DbConnectionFactory, IReportsDbConnectionFactory
{
    public ReportsDbConnectionFactory(string connectionString) : base(connectionString) { }
}

// Program.cs
builder.Services.AddSingleton<IDbConnectionFactory>(_ => new DbConnectionFactory(mainConn));
builder.Services.AddSingleton<IReportsDbConnectionFactory>(_ => new ReportsDbConnectionFactory(reportsConn));
```

#### Opción B — Keyed Services (.NET 8+)

```csharp
builder.Services.AddKeyedSingleton<IDbConnectionFactory>("main",    (_, _) => new DbConnectionFactory(mainConn));
builder.Services.AddKeyedSingleton<IDbConnectionFactory>("reports", (_, _) => new DbConnectionFactory(reportsConn));

// Inyección en repositorio o servicio:
public sealed class ReportRepository : BaseRepository
{
    public ReportRepository(
        [FromKeyedServices("reports")] IDbConnectionFactory factory) : base(factory) { }
}
```

### 3. Transacciones en una misma BD

```csharp
using var conn = ConnectionFactory.CreateConnection();
conn.Open();
using var tx = conn.BeginTransaction();
try
{
    await conn.ExecuteAsync("UPDATE ...", new { ... }, transaction: tx);
    await conn.ExecuteAsync("INSERT ...", new { ... }, transaction: tx);
    tx.Commit();
}
catch
{
    tx.Rollback();
    throw;
}
```

> Transacciones distribuidas entre dos bases de datos distintas requieren un coordinador externo
> (Saga pattern, outbox pattern). Dapper no las gestiona automáticamente.

---

## Caché con Redis

Redis actúa como capa de caché entre la aplicación y la base de datos. En lugar de ir a MySQL en cada
consulta, el servicio verifica primero el caché: si el dato está ahí (**cache hit**), lo devuelve sin
tocar la BD; si no (**cache miss**), consulta la BD, guarda el resultado en Redis y lo retorna.
Este patrón se llama **Cache-Aside** (también conocido como Lazy Loading Cache).

### Configurar la conexión

`appsettings.json` ya tiene la clave `Redis:ConnectionString` vacía (viene con la plantilla).
Pon el valor real en `appsettings.Development.json` para desarrollo local (no lo commitas con credenciales):

```json
"Redis": {
  "ConnectionString": "localhost:6379"
}
```

Para Redis con contraseña:
```json
"Redis": {
  "ConnectionString": "localhost:6379,password=mipassword,ssl=false"
}
```

En producción usa variables de entorno (nunca credenciales en `appsettings.json`):
```bash
Redis__ConnectionString=redis.miservidor.com:6379,password=secret,ssl=true
```

### Activar en `Infrastructure/DependencyInjection.cs`

Descomenta el bloque Redis ya incluido en el archivo:

```csharp
var redisConn = configuration["Redis:ConnectionString"];
if (!string.IsNullOrEmpty(redisConn))
{
    services.AddSingleton<IConnectionMultiplexer>(
        _ => ConnectionMultiplexer.Connect(redisConn));
    services.AddSingleton<ICacheService, RedisCacheService>();
}
```

### Usar el caché en un servicio (patrón Cache-Aside)

```csharp
public sealed class TecnicoService : ITecnicoService
{
    private readonly ITecnicoRepository _repo;
    private readonly ICacheService _cache;

    public TecnicoService(ITecnicoRepository repo, ICacheService cache)
    {
        _repo  = repo;
        _cache = cache;
    }

    public async Task<TecnicoDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var key = $"tecnico:{id}";

        // GetOrSetAsync = Get → si null, ejecuta factory → guarda en caché → retorna
        return await _cache.GetOrSetAsync<TecnicoDto>(
            key:     key,
            factory: async () => (await _repo.GetByIdAsync(id, ct))?.ToDto(),
            expiry:  TimeSpan.FromMinutes(30),
            ct:      ct);
    }

    public async Task<Result<TecnicoDto>> UpdateAsync(int id, UpdateTecnicoRequest request, CancellationToken ct = default)
    {
        // ... lógica de actualización ...

        // Invalidar caché al actualizar para que el próximo Get consulte la BD
        await _cache.RemoveAsync($"tecnico:{id}", ct);
        return Result<TecnicoDto>.Success(tecnicoActualizado);
    }
}
```

### Métodos disponibles en `ICacheService`

| Método | Descripción |
|---|---|
| `GetAsync<T>(key)` | Obtiene del caché; null si no existe o expiró |
| `SetAsync<T>(key, value, expiry?)` | Guarda en caché (default: 10 min) |
| `RemoveAsync(key)` | Elimina una entrada (invalidación manual) |
| `GetOrSetAsync<T>(key, factory, expiry?)` | Cache-Aside completo en una sola llamada |

### Convenciones de naming de claves

```csharp
// Entidad individual
$"tecnico:{id}"           // tecnico:42

// Lista / colección
"tecnicos:all"

// Filtro compuesto
$"tecnicos:empresa:{empresaId}"   // tecnicos:empresa:7

// Con versión (útil para invalidación por prefijo en Redis 7+)
$"v1:tecnico:{id}"
```

> La conexión Redis (`IConnectionMultiplexer`) se registra como **Singleton** porque es thread-safe,
> cara de crear (handshake TCP) y está diseñada para ser reutilizada por toda la vida de la app.

---

## Integración con CQRS (opcional)

Esta plantilla usa servicios de aplicación simples (`IExampleService`). Si el proyecto crece y necesitas
separar lecturas y escrituras a distintas fuentes de datos (réplicas de BD), puedes integrar CQRS con MediatR:

1. Agrega el paquete: `dotnet add WinServices.Application package MediatR`
2. Reemplaza los servicios por `IRequest<T>` (Commands) e `IRequestHandler<T>` (Handlers)
3. Registra en `Program.cs`: `builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...))`
4. En los controllers inyecta `IMediator` en lugar del servicio

> CQRS tiene sentido cuando las lecturas van a una réplica de solo lectura y las escrituras
> al nodo primario. Sin esa infraestructura, añade complejidad sin beneficio real.

---

## Despliegue en Producción (Docker)

La plantilla ya viene preconfigurada con un `docker-compose.yml` optimizado para producción que no requiere compilar la imagen de Docker. En lugar de eso, monta directamente los binarios ya compilados, lo cual hace que los despliegues y actualizaciones sean sumamente rápidos.

### Flujo de despliegue

**1. Publicar el código**
Debes generar los binarios optimizados (Release) utilizando el SDK de .NET en tu servidor de integración continua (CI/CD) o máquina local. El comando asume que te encuentras en la raíz del proyecto generado:

```bash
dotnet publish WinServices.Api/WinServices.Api.csproj -c Release -o ./publish
```
*(Nota: Reemplaza `WinServices` por el nombre real que le hayas dado a tu proyecto).*

**2. Configurar variables de entorno**
La plantilla incluye un archivo `.env-example`. Renómbralo a `.env` y ajusta las credenciales de base de datos, Secretos JWT, RabbitMQ, Redis y la URL de OpenTelemetry según tu entorno de producción.

```bash
cp .env-example .env
# Edita el archivo .env con tus valores reales
```

**3. Levantar el contenedor**
Ejecuta Docker Compose para levantar el servicio. Usamos la imagen ligera de ASP.NET Runtime (no el SDK) y montamos la carpeta `./publish` a través de un volumen, por lo que la aplicación arrancará instantáneamente:

```bash
docker compose up -d
```

**4. Actualizaciones futuras**
Cuando quieras subir un parche o nueva versión, solo debes repetir el `dotnet publish` para actualizar los archivos de la carpeta local `./publish` en tu servidor y luego simplemente reiniciar el contenedor:

```bash
docker restart mi_proyecto_api
```

> **Nota sobre el motor de plantillas:** Al crear un nuevo proyecto usando el comando `dotnet new`, nombres base como `WinServices.Api.Api.dll` dentro del archivo `docker-compose.yml` o `WinServices.ApiAPI` dentro del archivo `.env-example` son **reemplazados automáticamente** por el nombre de tu nuevo proyecto. No necesitas modificarlos a mano tras ejecutar la plantilla.
