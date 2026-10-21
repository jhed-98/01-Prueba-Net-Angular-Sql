using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using WinServices.Api.Application.Interfaces;
using WinServices.Api.Application.Services;

namespace WinServices.Api.Application;

/// <summary>
/// Registro de dependencias de la capa Application.
/// Llamar desde Program.cs: builder.Services.AddApplication()
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Escanea y registra todos los validadores del assembly de Application.
        // Apunta al assembly por la clase contenedora (DependencyInjection), no por
        // un validador concreto — así no hay dependencia de ninguna clase específica.
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        // TODO: Registra aquí tus servicios de aplicación reales
        services.AddScoped<IExampleService, ExampleService>();
        return services;
    }
}
