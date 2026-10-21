using FluentValidation;
using WinServices.Api.Application.DTOs;

namespace WinServices.Api.Application.Validators;

public sealed class CreateExampleValidator : AbstractValidator<CreateExampleRequest>
{
    public CreateExampleValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no puede superar los 100 caracteres.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("La descripción no puede superar los 500 caracteres.")
            .When(x => x.Description is not null);
    }
}
