using FluentValidation;
using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Application.Validators;

public sealed class CreateTareaValidator : AbstractValidator<CreateTareaRequest>
{
    public CreateTareaValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty().WithMessage("El título es obligatorio.")
            .Length(3, 150).WithMessage("El título debe tener entre 3 y 150 caracteres.");

        RuleFor(x => x.Descripcion)
            .MaximumLength(500).WithMessage("La descripción no puede superar los 500 caracteres.")
            .When(x => x.Descripcion is not null);

        RuleFor(x => x.FechaFin)
            .GreaterThanOrEqualTo(x => x.FechaInicio)
            .WithMessage("La fecha de fin no puede ser menor que la fecha de inicio.")
            .When(x => x.FechaFin.HasValue);

        RuleFor(x => x.CategoriaId)
            .GreaterThan(0).WithMessage("La categoría es obligatoria.");
    }
}
