using Microsoft.Extensions.Diagnostics.HealthChecks;
using webapi.Services;

namespace webapi.Health;

public sealed class MetadataProviderHealthCheck(IMetadataService metadataService) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var providerAvailable = await metadataService.IsProviderAvailableAsync(cancellationToken);

        return providerAvailable
            ? HealthCheckResult.Healthy("Metadata provider is healthy.")
            : HealthCheckResult.Degraded("Metadata provider is unavailable.");
    }
}
