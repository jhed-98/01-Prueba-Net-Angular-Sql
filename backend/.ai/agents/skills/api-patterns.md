---
name: api-patterns
description: Patrones de API REST para la plantilla win-services-api. Cubre controllers, middleware, filtros, autenticación JWT, autorización por roles y políticas, y manejo global de errores.
---

# API REST — Patrones

## Controllers

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class MiEntidadController : ControllerBase
{
    private readonly IMiEntidadService _service;
    public MiEntidadController(IMiEntidadService service) => _service = service;

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
    public async Task<IActionResult> Create([FromBody] CreateMiEntidadRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMiEntidadRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        if (!result.IsSuccess)
            return result.Error!.Contains("no encontrado") ? NotFound(new { error = result.Error }) : BadRequest(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(id, ct);
        return result.IsSuccess ? NoContent() : NotFound(new { error = result.Error });
    }
}
```

## Middleware personalizado

```csharp
// Api/Middleware/RequestTimingMiddleware.cs
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

// Registrar en Program.cs:
app.UseMiddleware<RequestTimingMiddleware>();
```

## Manejo global de errores

```csharp
// Api/Middleware/GlobalExceptionMiddleware.cs
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

// Registrar en Program.cs (antes de UseAuthentication):
app.UseMiddleware<GlobalExceptionMiddleware>();
```

## Filtros de acción (Action Filters)

```csharp
// Api/Filters/ValidationFilter.cs
// Valida ModelState antes de que llegue al action — útil para validaciones de data annotations
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

// Registrar globalmente en Program.cs:
builder.Services.AddControllers(options =>
    options.Filters.Add<ValidationFilter>());

// O por controller / action:
[ServiceFilter(typeof(ValidationFilter))]
public sealed class MiController : ControllerBase { }
```

## Autenticación JWT

### Configuración base (ya incluida en la plantilla)

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSettings["Issuer"],
            ValidAudience            = jwtSettings["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
        };
    });
```

### Generar token JWT

```csharp
// Infrastructure/Authentication/JwtProvider.cs (ya incluido en la plantilla)
public string GenerateToken(int userId, string email, string role)
{
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        new Claim(ClaimTypes.Email, email),
        new Claim(ClaimTypes.Role, role)
    };

    var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer:             _issuer,
        audience:           _audience,
        claims:             claims,
        expires:            DateTime.UtcNow.AddMinutes(_expiryMinutes),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

## Autorización

### Por rol

```csharp
// Restringe a un rol específico
[Authorize(Roles = "Admin")]
[HttpDelete("{id:int}")]
public async Task<IActionResult> Delete(int id, CancellationToken ct) { ... }

// Múltiples roles (OR)
[Authorize(Roles = "Admin,Supervisor")]
public async Task<IActionResult> GetReporte(CancellationToken ct) { ... }
```

### Por política (Policy-based)

```csharp
// Definir políticas en DependencyInjection.cs o Program.cs:
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SoloAdmins", policy =>
        policy.RequireRole("Admin"));

    options.AddPolicy("PuedeEditar", policy =>
        policy.RequireRole("Admin", "Supervisor"));

    options.AddPolicy("EmpresaActiva", policy =>
        policy.RequireClaim("empresa_estado", "activa"));
});

// Usar en controller:
[Authorize(Policy = "PuedeEditar")]
[HttpPut("{id:int}")]
public async Task<IActionResult> Update(int id, ...) { ... }
```

### Leer claims del usuario autenticado

```csharp
// Dentro de cualquier controller (ControllerBase expone User):
var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
var email  = User.FindFirstValue(ClaimTypes.Email)!;
var role   = User.FindFirstValue(ClaimTypes.Role)!;
var isAdmin = User.IsInRole("Admin");
```

### Endpoint público dentro de controller protegido

```csharp
[ApiController]
[Route("api/tecnicos")]
[Authorize]                     // protege todo el controller
public sealed class TecnicosController : ControllerBase
{
    [AllowAnonymous]            // este endpoint específico es público
    [HttpGet("ping")]
    public IActionResult Ping() => Ok("pong");

    [HttpGet]                   // requiere autenticación (hereda del controller)
    public async Task<IActionResult> GetAll(CancellationToken ct) { ... }
}
```

---

## Health Checks

Endpoint público `/health` incluido por defecto en la plantilla. Devuelve JSON con el estado
de cada dependencia. El check de BD siempre activo; Redis y RabbitMQ se habilitan con su feature.

### Checks disponibles (Infrastructure/HealthChecks/)

| Clase | Tag | Cuándo activar |
|---|---|---|
| `DatabaseHealthCheck` | `db` | Al descomentar en DI (opt-in) |
| `RedisHealthCheck` | `cache` | Al descomentar junto con el bloque Redis en DI |
| `RabbitMqHealthCheck` | `messaging` | Al descomentar junto con el bloque RabbitMQ en DI |

> Por defecto `/health` responde `Healthy` con `checks: []` — ningún check activo.

### Registrar en DependencyInjection.cs

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["db"])
    .AddCheck<RedisHealthCheck>("redis",        tags: ["cache"])     // si Redis activo
    .AddCheck<RabbitMqHealthCheck>("rabbitmq",  tags: ["messaging"]); // si RabbitMQ activo
```

### Crear un check personalizado

```csharp
public sealed class MiHealthCheck : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            // verificar conectividad / estado
            return HealthCheckResult.Healthy("Disponible.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("No disponible.", ex);
        }
    }
}
```

### Filtrar por tag (liveness vs. readiness)

```csharp
// Solo proceso vivo (sin checks de infra) — para livenessProbe en Kubernetes
app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();

// Todas las dependencias — para readinessProbe
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = c => c.Tags.Contains("db") || c.Tags.Contains("cache") || c.Tags.Contains("messaging")
}).AllowAnonymous();
```

### Respuesta JSON esperada

```json
{
  "status": "Healthy",
  "duration": 12.45,
  "checks": [
    { "name": "database", "status": "Healthy", "description": "Base de datos disponible.", "tags": ["db"] },
    { "name": "redis",    "status": "Healthy", "description": "Redis disponible. Latencia: 0.8ms", "tags": ["cache"] }
  ]
}
```
