using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using webapi.Options;

namespace webapi.Data;

public sealed partial class DatabaseInitializer(
    AppDbContext dbContext,
    IOptions<StationCatalogOptions> stationCatalogOptions,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var catalog = stationCatalogOptions.Value.Stations
            .OrderBy(station => station.SortOrder)
            .ToList();

        var existingStations = await dbContext.Stations.ToDictionaryAsync(station => station.Key, cancellationToken);
        var knownKeys = catalog.Select(station => station.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var definition in catalog)
        {
            if (!existingStations.TryGetValue(definition.Key, out var station))
            {
                station = new Station
                {
                    Id = Guid.NewGuid(),
                    Key = definition.Key
                };
                dbContext.Stations.Add(station);
            }

            station.Name = definition.Name;
            station.Descriptor = definition.Descriptor;
            station.Description = definition.Description;
            station.StreamUrl = definition.StreamUrl;
            station.ArtworkUrl = definition.ArtworkUrl;
            station.AccentColor = definition.AccentColor;
            station.SecondaryAccentColor = definition.SecondaryAccentColor;
            station.Mood = definition.Mood;
            station.SortOrder = definition.SortOrder;
            station.IsActive = definition.IsActive;
        }

        foreach (var staleStation in existingStations.Values.Where(station => !knownKeys.Contains(station.Key)))
        {
            staleStation.IsActive = false;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        Log.StationCatalogInitialized(logger, catalog.Count);
    }

    private static partial class Log
    {
        [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Station catalog initialized with {StationCount} stations.")]
        public static partial void StationCatalogInitialized(ILogger logger, int stationCount);
    }
}
