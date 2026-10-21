# win-services-api — Guía para Claude Code

> Este archivo se carga automáticamente en cada sesión de Claude Code.
> La información detallada de cada área está en `.ai/agents/skills/`.

---

## 1. Contexto del Proyecto

**Propósito**: API REST con Clean Architecture, Dapper y JWT generada desde la plantilla `win-services-api`.

**Stack técnico**:
- Backend: ASP.NET Core Web API (.NET 10), Clean Architecture
- ORM: Dapper (SQL explícito, sin migraciones automáticas)
- Base de datos: MySQL (configurable a PostgreSQL / SQL Server)
- Auth: JWT Bearer
- Logging: Serilog (consola + archivo)
- Validación: FluentValidation
- Mapeo: Mapperly (source generation)
- Cliente HTTP: RestSharp
- Docs API: Scalar UI en `/scalar/v1`

**Puerto por defecto**: `http://localhost:5000`

---

## 2. Estructura del Proyecto

```
MiProyecto/
├── MiProyecto.Domain/          # Entidades puras. Sin dependencias externas.
├── MiProyecto.Application/     # DTOs, interfaces, servicios, validadores, mappers.
│   ├── Common/                 # Result<T>
│   ├── DTOs/                   # Records inmutables de entrada/salida
│   ├── Interfaces/             # Contratos de repos, servicios, auth, http
│   ├── Mapping/                # Mappers Mapperly
│   ├── Services/               # Lógica de aplicación
│   ├── Validators/             # FluentValidation
│   └── DependencyInjection.cs  # ← registra servicios y validadores de esta capa
├── MiProyecto.Infrastructure/  # Implementaciones: Dapper, RestSharp, JWT, BCrypt
│   ├── Authentication/
│   ├── Data/
│   ├── Http/
│   ├── Repositories/
│   └── DependencyInjection.cs  # ← registra repos, factories y clientes HTTP
└── MiProyecto.Api/             # Controllers, middleware, filtros, Program.cs
    ├── Controllers/
    ├── Filters/
    ├── Middleware/
    └── Program.cs              # Solo configura: Serilog, OpenAPI, JWT y llama AddApplication/AddInfrastructure
```

---

## 3. Clean Architecture — Reglas Estrictas

1. **Domain**: Sin dependencias externas. No importar Dapper, RestSharp, ni frameworks.
2. **Application**: Solo interfaces del dominio. No implementa — orquesta.
3. **Infrastructure**: Única capa con Dapper y RestSharp. Implementa repositorios y clientes HTTP.
4. **Api**: Registra DI en `Program.cs` llamando `AddApplication()` + `AddInfrastructure()`.

> Nunca instales Dapper o RestSharp en Domain o Application.

---

## 4. Registro de Dependencias

**Nunca registres servicios directamente en `Program.cs`.**
Cada capa tiene su `DependencyInjection.cs`:

```csharp
// Application/DependencyInjection.cs → servicios + validadores
services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
services.AddScoped<IMiServicio, MiServicio>();

// Infrastructure/DependencyInjection.cs → repos + factories + clientes HTTP
services.AddScoped<IMiRepository, MiRepository>();
```

`Program.cs` solo llama:
```csharp
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
```

---

## 5. Estándares de Codificación

| Tipo | Convención | Ejemplo |
|---|---|---|
| Clases, interfaces, métodos, propiedades | PascalCase | `TecnicoService`, `IRepository` |
| Variables y parámetros locales | camelCase | `idTecnico`, `fechaInicio` |
| Campos privados (DI/readonly) | _camelCase | `_technicianRepository` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_RETRIES` |

### Reglas de código
- `var` solo cuando el tipo es evidente en el lado derecho.
- Siempre `async`/`await`. Nunca `.Result` ni `.Wait()`.
- Siempre llaves `{}` en `if/else`, `for`, `foreach`.
- DTOs como `sealed record` (inmutables).
- Entidades con `private set` o `init` y constructor privado sin parámetros.
- Devolver `Result<T>` / `Result` desde servicios — nunca lanzar excepciones para flujo de negocio.
- SOLID, DRY, KISS, YAGNI.

---

## 6. Workflow: Agregar una Entidad Nueva

Sigue siempre este orden (detalle completo en `.ai/agents/skills/clean-architecture.md`):

1. Entidad en `Domain/Entities/`
2. DTOs en `Application/DTOs/`
3. Validador en `Application/Validators/`
4. Mapper en `Application/Mapping/` (Mapperly `[Mapper]`)
5. Interfaz repositorio en `Application/Interfaces/`
6. Interfaz servicio en `Application/Interfaces/`
7. Servicio en `Application/Services/`
8. Repositorio en `Infrastructure/Repositories/` (Dapper)
9. Controller en `Api/Controllers/`
10. Registrar en `DependencyInjection.cs` de Application e Infrastructure
11. SQL manual de la tabla (Dapper no genera migraciones)

---

## 7. Convenciones específicas

### FluentValidation
- Los validadores se detectan **automáticamente** via `AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly)`.
- Nunca los registres manualmente con `AddScoped<IValidator<T>>`.

### Mapperly
- Siempre en `Application/Mapping/` como `static partial class` con `[Mapper]`.
- Genera código en compilación — sin reflection en runtime.

### Serilog
- Usa propiedades nombradas: `_logger.LogInformation("Procesando {Id}", id)`.
- Nunca concatenes strings: `_logger.LogInformation("Procesando " + id)`.

### RestSharp
- Todos los clientes HTTP heredan de `HttpServiceBase` en `Infrastructure/Http/`.
- Registrar en `Infrastructure/DependencyInjection.cs`.
- URLs base en `appsettings.json` bajo `ExternalServices`.

---

## 8. Skills disponibles para Claude

| Archivo | Contenido |
|---|---|
| `.ai/agents/persona.md` | Rol y stack del agente |
| `.ai/agents/skills/clean-architecture.md` | Reglas de capas y workflow de 11 pasos |
| `.ai/agents/skills/dapper-patterns.md` | CRUD, SPs, transacciones, relaciones one-to-many y many-to-many |
| `.ai/agents/skills/api-patterns.md` | Controllers, middleware, filtros, auth/authz, health checks |
| `.ai/agents/skills/validation-mapping.md` | FluentValidation y Mapperly |
| `.ai/agents/skills/logging-http.md` | Serilog, RestSharp y Circuit Breaker con Polly |
| `.ai/agents/skills/cache-messaging.md` | Redis (Cache-Aside, ICacheService) y RabbitMQ (IMessageBus, consumidores) |
