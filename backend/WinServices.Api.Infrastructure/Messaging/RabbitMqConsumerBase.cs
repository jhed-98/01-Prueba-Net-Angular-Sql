using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace WinServices.Api.Infrastructure.Messaging;

/// <summary>
/// Base para consumidores de colas RabbitMQ que corren como hosted services en background.
/// Hereda esta clase, define <see cref="QueueName"/> y sobreescribe <see cref="HandleAsync"/>.
///
/// Recibe un <see cref="ConnectionFactory"/> (no una conexión eager) y crea la conexión de
/// forma perezosa en <see cref="ExecuteAsync"/>. Así el arranque del host no depende de que
/// el broker esté levantado — solo falla el consumidor en runtime si RabbitMQ no responde.
///
/// Registrar el consumidor concreto en Program.cs:
///   builder.Services.AddHostedService&lt;MiConsumidor&gt;();
///
/// Ejemplo:
///   public sealed class ActivacionConsumer : RabbitMqConsumerBase
///   {
///       public ActivacionConsumer(ConnectionFactory factory, ILogger&lt;ActivacionConsumer&gt; logger)
///           : base(factory, logger) { }
///
///       protected override string QueueName => "activaciones";
///
///       protected override async Task HandleAsync(string message, CancellationToken ct)
///       {
///           var evento = JsonSerializer.Deserialize&lt;ActivacionEvent&gt;(message)!;
///           // procesar evento...
///       }
///   }
/// </summary>
public abstract class RabbitMqConsumerBase : BackgroundService
{
    private readonly ConnectionFactory _factory;
    private readonly ILogger _logger;
    private IConnection? _connection;
    private IChannel? _channel;

    /// <summary>Nombre de la cola que este consumidor escucha.</summary>
    protected abstract string QueueName { get; }

    /// <summary>
    /// Configura la cola al inicio. Sobreescribe para declarar bindings, dead-letter queues, etc.
    /// Por defecto declara la cola como durable, no exclusiva y sin auto-delete.
    /// </summary>
    protected virtual async Task ConfigureQueueAsync(IChannel channel, CancellationToken ct)
    {
        await channel.QueueDeclareAsync(
            queue:      QueueName,
            durable:    true,
            exclusive:  false,
            autoDelete: false,
            arguments:  null,
            cancellationToken: ct);
    }

    /// <summary>Procesa el mensaje recibido. Si lanza excepción, el mensaje va a NACK (sin requeue).</summary>
    protected abstract Task HandleAsync(string message, CancellationToken ct);

    protected RabbitMqConsumerBase(ConnectionFactory factory, ILogger logger)
    {
        _factory = factory;
        _logger  = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _connection = await _factory.CreateConnectionAsync(stoppingToken);
        _channel    = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        // Procesa hasta 1 mensaje a la vez por consumidor (fair dispatch)
        await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 1, global: false, stoppingToken);

        await ConfigureQueueAsync(_channel, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            var body    = Encoding.UTF8.GetString(ea.Body.ToArray());
            var tag     = ea.DeliveryTag;

            try
            {
                _logger.LogDebug("Mensaje recibido de {Queue}: {DeliveryTag}", QueueName, tag);
                await HandleAsync(body, stoppingToken);
                await _channel.BasicAckAsync(tag, multiple: false, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error procesando mensaje {DeliveryTag} de {Queue}", tag, QueueName);
                // requeue: false → el mensaje va a la dead-letter queue si está configurada
                await _channel.BasicNackAsync(tag, multiple: false, requeue: false, stoppingToken);
            }
        };

        await _channel.BasicConsumeAsync(
            queue:     QueueName,
            autoAck:   false,         // manual ACK para garantizar procesamiento
            consumer:  consumer,
            cancellationToken: stoppingToken);

        _logger.LogInformation("Consumidor {Consumer} escuchando cola {Queue}", GetType().Name, QueueName);

        // Mantiene el hosted service corriendo hasta que se solicite stop
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        if (_channel?.IsOpen == true)
        {
            await _channel.CloseAsync();
        }
    }
}
