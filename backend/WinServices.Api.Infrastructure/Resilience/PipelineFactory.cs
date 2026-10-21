using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

namespace WinServices.Api.Infrastructure.Resilience;

/// <summary>
/// Fábrica del pipeline de resiliencia estándar (Polly v8) compartido por todos los
/// clientes HTTP externos: retry exponencial con jitter + circuit breaker.
///
/// Uso en DI:
///   var pipeline = PipelineFactory.Create();
///   services.AddScoped<MiApiHttpService>(_ => new MiApiHttpService(url, pipeline));
/// </summary>
public static class PipelineFactory
{
    public static ResiliencePipeline Create() =>
        new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay            = TimeSpan.FromSeconds(2),
                BackoffType      = DelayBackoffType.Exponential,
                UseJitter        = true
            })
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                FailureRatio      = 0.5,
                SamplingDuration  = TimeSpan.FromSeconds(10),
                MinimumThroughput = 5,
                BreakDuration     = TimeSpan.FromSeconds(30)
            })
            .Build();
}
