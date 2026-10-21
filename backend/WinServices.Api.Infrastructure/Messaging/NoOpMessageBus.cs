using Microsoft.Extensions.Logging;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Infrastructure.Messaging;

/// <summary>
/// Implementación no-op de <see cref="IMessageBus"/> para cuando RabbitMQ no está configurado.
/// La aplicación arranca y funciona sin mensajería; los intentos de publicación solo se loguean.
/// Se registra en el `else` del bloque RabbitMQ en <c>DependencyInjection.cs</c>.
/// </summary>
public sealed class NoOpMessageBus : IMessageBus
{
    private readonly ILogger<NoOpMessageBus> _logger;

    public NoOpMessageBus(ILogger<NoOpMessageBus> logger) => _logger = logger;

    public Task PublishAsync<T>(
        string exchange,
        string routingKey,
        T message,
        CancellationToken ct = default) where T : class
    {
        _logger.LogWarning(
            "NoOpMessageBus: mensaje NO publicado (RabbitMQ no configurado). Exchange: {Exchange} | Key: {Key}",
            exchange, routingKey);
        return Task.CompletedTask;
    }
}
