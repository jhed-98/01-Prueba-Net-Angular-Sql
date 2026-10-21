namespace WinServices.Api.Application.Interfaces;

/// <summary>
/// Contrato para publicar mensajes a un bus de mensajería (RabbitMQ).
/// La implementación concreta vive en Infrastructure.
/// Inyecta esta interfaz en servicios que necesiten publicar eventos o comandos asincrónicos.
/// </summary>
public interface IMessageBus
{
    /// <summary>
    /// Publica un mensaje serializado como JSON en el exchange indicado.
    /// </summary>
    /// <param name="exchange">Nombre del exchange (vacío = default exchange).</param>
    /// <param name="routingKey">Routing key (= nombre de la cola en el default exchange).</param>
    /// <param name="message">Objeto a serializar y publicar.</param>
    Task PublishAsync<T>(
        string exchange,
        string routingKey,
        T message,
        CancellationToken ct = default) where T : class;
}
