using Microsoft.EntityFrameworkCore;
using webapi.Contracts;
using webapi.Data;

namespace webapi.Services;

public interface IStationService
{
    Task<IReadOnlyList<StationSummaryDto>> GetPublishedStationsAsync(CancellationToken cancellationToken);
    Task<StationDetailDto?> GetStationAsync(string key, CancellationToken cancellationToken);
    Task<Station?> GetActiveStationEntityAsync(string key, CancellationToken cancellationToken);
    Task<bool> StationExistsAsync(string key, CancellationToken cancellationToken);
}

public sealed class StationService(AppDbContext dbContext) : IStationService
{
    public async Task<IReadOnlyList<StationSummaryDto>> GetPublishedStationsAsync(CancellationToken cancellationToken)
    {
        return await dbContext.Stations
            .AsNoTracking()
            .Where(station => station.IsActive)
            .OrderBy(station => station.SortOrder)
            .ThenBy(station => station.Name)
            .Select(station => new StationSummaryDto(
                station.Key,
                station.Name,
                station.Descriptor,
                station.Description,
                station.StreamUrl,
                station.ArtworkUrl,
                station.AccentColor,
                station.SecondaryAccentColor,
                station.Mood,
                station.SortOrder))
            .ToListAsync(cancellationToken);
    }

    public async Task<StationDetailDto?> GetStationAsync(string key, CancellationToken cancellationToken)
    {
        var normalizedKey = NormalizeKey(key);

        return await dbContext.Stations
            .AsNoTracking()
            .Where(station => station.Key == normalizedKey && station.IsActive)
            .Select(station => new StationDetailDto(
                station.Key,
                station.Name,
                station.Descriptor,
                station.Description,
                station.StreamUrl,
                station.ArtworkUrl,
                station.AccentColor,
                station.SecondaryAccentColor,
                station.Mood,
                station.SortOrder,
                station.IsActive))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public Task<Station?> GetActiveStationEntityAsync(string key, CancellationToken cancellationToken)
    {
        var normalizedKey = NormalizeKey(key);

        return dbContext.Stations
            .SingleOrDefaultAsync(station => station.Key == normalizedKey && station.IsActive, cancellationToken);
    }

    public Task<bool> StationExistsAsync(string key, CancellationToken cancellationToken)
    {
        var normalizedKey = NormalizeKey(key);
        return dbContext.Stations.AnyAsync(station => station.Key == normalizedKey && station.IsActive, cancellationToken);
    }

    private static string NormalizeKey(string key) => key.Trim().ToLowerInvariant();
}
