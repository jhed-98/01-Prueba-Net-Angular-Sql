using System.Text.Json;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using WinServices.Api.Application.Interfaces;

namespace WinServices.Api.Infrastructure.Messaging;

/// <summary>
/// Implementación de <see cref="IMessageBus"/> sobre RabbitMQ.
/// Serializa el mensaje como JSON y lo publica como mensaje persistente (DeliveryMode = Persistent).
///
/// La conexión se crea de forma perezosa (lazy) en la primera publicación y se reutiliza.
/// Esto permite que la aplicación arranque y funcione aunque RabbitMQ esté caído en el momento
/// del startup; solo falla (y reintenta) al momento de publicar.
/// Registrar como Scoped: un canal por request.
/// </summary>
public sealed class RabbitMqMessageBus : IMessageBus, IAsyncDisposable
{
    private readonly ConnectionFactory _factory;
    private readonly ILogger<RabbitMqMessageBus> _logger;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqMessageBus(ConnectionFactory factory, ILogger<RabbitMqMessageBus> logger)
    {
        _factory = factory;
        _logger  = logger;
    }

    private async ValueTask<IChannel> GetChannelAsync(CancellationToken ct)
    {
        if (_channel is not null && _channel.IsOpen && _connection is not null && _connection.IsOpen)
            return _channel;

        await _semaphore.WaitAsync(ct);
        try
        {
            if (_channel is not null && _channel.IsOpen && _connection is not null && _connection.IsOpen)
                return _channel;

            if (_channel is not null) { await _channel.DisposeAsync(); _channel = null; }
            if (_connection is not null) { await _connection.DisposeAsync(); _connection = null; }

            _connection = await _factory.CreateConnectionAsync(ct);
            _channel    = await _connection.CreateChannelAsync(cancellationToken: ct);
            _logger.LogInformation("RabbitMQ conectado correctamente.");
            return _channel;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error conectando a RabbitMQ.");
            throw;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task PublishAsync<T>(
        string exchange,
        string routingKey,
        T message,
        CancellationToken ct = default) where T : class
    {
        var channel = await GetChannelAsync(ct);

        var body  = JsonSerializer.SerializeToUtf8Bytes(message);
        var props = new BasicProperties
        {
            ContentType  = "application/json",
            DeliveryMode = DeliveryModes.Persistent   // sobrevive reinicios del broker
        };

        await channel.BasicPublishAsync(
            exchange:   exchange,
            routingKey: routingKey,
            mandatory:  false,
            basicProperties: props,
            body:       body,
            cancellationToken: ct);

        _logger.LogInformation(
            "Mensaje publicado → exchange: {Exchange} | routingKey: {RoutingKey} | tipo: {Tipo}",
            exchange, routingKey, typeof(T).Name);
    }

    public async ValueTask DisposeAsync()
    {
        _semaphore.Dispose();
        if (_channel is not null)
        {
            if (_channel.IsOpen)
                await _channel.CloseAsync();
            await _channel.DisposeAsync();
        }
        if (_connection is not null)
            await _connection.DisposeAsync();
    }
}
