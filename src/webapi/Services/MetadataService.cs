using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using webapi.Contracts;
using webapi.Data;
using webapi.Options;

namespace webapi.Services;

public enum MetadataAvailability
{
    Available,
    Missing,
    Unavailable
}

public sealed record MetadataFetchResult(MetadataAvailability Availability, NowPlayingDto? Payload);

public interface IMetadataService
{
    Task<MetadataFetchResult> GetNowPlayingAsync(string stationKey, CancellationToken cancellationToken);
    Task<bool> IsProviderAvailableAsync(CancellationToken cancellationToken);
}

public sealed class MetadataService(
    AppDbContext dbContext,
    IOptionsMonitor<StationCatalogOptions> stationCatalogOptions,
    IOptionsMonitor<MetadataOptions> metadataOptions) : IMetadataService
{
    public Task<bool> IsProviderAvailableAsync(CancellationToken cancellationToken)
    {
        _ = cancellationToken;
        return Task.FromResult(metadataOptions.CurrentValue.ProviderAvailable);
    }

    public async Task<MetadataFetchResult> GetNowPlayingAsync(string stationKey, CancellationToken cancellationToken)
    {
        var normalizedKey = stationKey.Trim().ToLowerInvariant();

        var station = await dbContext.Stations
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Key == normalizedKey && item.IsActive, cancellationToken);

        if (station is null)
        {
            return new MetadataFetchResult(MetadataAvailability.Missing, null);
        }

        if (!metadataOptions.CurrentValue.ProviderAvailable)
        {
            return new MetadataFetchResult(MetadataAvailability.Unavailable, null);
        }

        var configuredStation = stationCatalogOptions.CurrentValue.Stations
            .FirstOrDefault(item => string.Equals(item.Key, normalizedKey, StringComparison.OrdinalIgnoreCase));

        if (configuredStation is null || configuredStation.Tracks.Count == 0)
        {
            return new MetadataFetchResult(
                MetadataAvailability.Available,
                new NowPlayingDto(
                    station.Key,
                    station.Name,
                    null,
                    null,
                    station.ArtworkUrl,
                    null,
                    null,
                    DateTimeOffset.UtcNow,
                    true));
        }

        var track = SelectTrack(configuredStation.Tracks, DateTimeOffset.UtcNow, out var startedAt);
        var payload = new NowPlayingDto(
            station.Key,
            station.Name,
            track.Title,
            track.Artist,
            station.ArtworkUrl,
            startedAt,
            track.DurationSeconds,
            DateTimeOffset.UtcNow,
            true);

        return new MetadataFetchResult(MetadataAvailability.Available, payload);
    }

    private static StationTrackOptions SelectTrack(
        List<StationTrackOptions> tracks,
        DateTimeOffset now,
        out DateTimeOffset startedAt)
    {
        var loopLength = tracks.Sum(track => Math.Max(track.DurationSeconds, 120));
        var cursor = (int)(now.ToUnixTimeSeconds() % loopLength);
        var elapsed = 0;

        foreach (var track in tracks)
        {
            var duration = Math.Max(track.DurationSeconds, 120);
            if (cursor < elapsed + duration)
            {
                startedAt = now.AddSeconds(-(cursor - elapsed));
                return track;
            }

            elapsed += duration;
        }

        var fallbackTrack = tracks[0];
        startedAt = now.AddSeconds(-Math.Min(fallbackTrack.DurationSeconds, 120));
        return fallbackTrack;
    }
}
