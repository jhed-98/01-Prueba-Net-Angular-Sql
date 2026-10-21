---
name: validation-mapping
description: Patrones de validación con FluentValidation y mapeo con Mapperly en la plantilla win-services-api.
---

# Validación y Mapeo

## FluentValidation

### Reglas comunes

```csharp
public sealed class CreateTecnicoValidator : AbstractValidator<CreateTecnicoRequest>
{
    public CreateTecnicoValidator()
    {
        // Texto obligatorio con longitud y solo letras
        RuleFor(x => x.Nombres)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(50).WithMessage("Máximo 50 caracteres.")
            .Matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$").WithMessage("Solo se permiten letras.");

        // DNI: 8 dígitos numéricos
        RuleFor(x => x.NroDocumento)
            .NotEmpty()
            .Length(8).WithMessage("El DNI debe tener 8 dígitos.")
            .Matches("^[0-9]+$").WithMessage("Solo dígitos.");

        // Celular: 9 dígitos, empieza con 9
        RuleFor(x => x.Celular)
            .NotEmpty()
            .Length(9).WithMessage("El celular debe tener 9 dígitos.")
            .Must(c => c.StartsWith("9")).WithMessage("Debe comenzar con 9.");

        // Email
        RuleFor(x => x.Correo)
            .NotEmpty()
            .EmailAddress().WithMessage("Formato de email inválido.");

        // IMEI obligatorio: 15 dígitos
        RuleFor(x => x.Imei1)
            .NotEmpty()
            .Length(15).WithMessage("El IMEI debe tener 15 dígitos.")
            .Matches("^[0-9]+$");

        // IMEI opcional: solo válido si se ingresa
        RuleFor(x => x.Imei2)
            .Length(15).WithMessage("El IMEI2 debe tener 15 dígitos.")
            .Matches("^[0-9]+$")
            .When(x => x.Imei2 is not null);

        // Enum válido
        RuleFor(x => x.TipoDocumento)
            .IsInEnum().WithMessage("Tipo de documento inválido.");
    }
}
```

### Validación en el servicio

```csharp
public async Task<Result<MiDto>> CreateAsync(MiRequest request, CancellationToken ct = default)
{
    var validation = await _validator.ValidateAsync(request, ct);
    if (!validation.IsValid)
    {
        var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
        _logger.LogWarning("Validación fallida: {Errors}", errors);
        return Result<MiDto>.Failure(errors);
    }
    // continúa...
}
```

### Registro automático (NO manual)

```csharp
// Application/DependencyInjection.cs — detecta TODOS los validadores del assembly
services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
// Nunca registres validadores individualmente con AddScoped<IValidator<T>, TValidator>
```

## Mapperly

### Mapper básico (nombres iguales)

```csharp
[Mapper]
public static partial class TecnicoMapper
{
    public static partial TecnicoDto ToDto(this Tecnico tecnico);
    public static partial IEnumerable<TecnicoDto> ToDtoList(this IEnumerable<Tecnico> tecnicos);
}

// Uso:
var dto  = tecnico.ToDto();
var dtos = tecnicos.ToDtoList();
```

### Mapeo con nombres diferentes

```csharp
[Mapper]
public static partial class PedidoMapper
{
    [MapProperty(nameof(Pedido.FechaCreacion), nameof(PedidoDto.FechaRegistro))]
    public static partial PedidoDto ToDto(this Pedido pedido);
}
```

### Ignorar propiedades

```csharp
[Mapper]
public static partial class UsuarioMapper
{
    [MapperIgnoreTarget(nameof(UsuarioDto.PasswordHash))]
    public static partial UsuarioDto ToDto(this Usuario usuario);
}
```

### Mapeo de tipos anidados

Mapperly resuelve automáticamente propiedades de tipo complejo si hay un mapper definido para ese tipo:

```csharp
[Mapper]
public static partial class PedidoMapper
{
    public static partial PedidoDto ToDto(this Pedido pedido);
    // Si PedidoDto.Cliente es ClienteDto y Pedido.Cliente es Cliente,
    // Mapperly usa ClienteMapper.ToDto() automáticamente si existe en el mismo [Mapper]
    private static partial ClienteDto MapCliente(Cliente cliente);
}
```
