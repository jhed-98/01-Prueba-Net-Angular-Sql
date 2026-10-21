using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace WinServices.Api.Api.Filters;

/// <summary>
/// Filtro que devuelve 400 Bad Request con los errores de ModelState cuando el modelo
/// no es válido, usando el shape estándar { ok, errors }. Se registra en Program.cs:
///   builder.Services.AddControllers(opts => opts.Filters.Add<ValidationFilter>());
/// </summary>
public sealed class ValidationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(kvp => kvp.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(error => error.ErrorMessage));

            context.Result = new BadRequestObjectResult(new { ok = false, errors });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
