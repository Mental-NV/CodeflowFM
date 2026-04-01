using webapi.Services;

namespace webapi.Endpoints;

public static class StationEndpoints
{
    public static RouteGroupBuilder MapStationEndpoints(this RouteGroupBuilder api)
    {
        var stations = api.MapGroup("/stations");

        stations.MapGet("/", async (IStationService stationService, CancellationToken cancellationToken) =>
        {
            var payload = await stationService.GetPublishedStationsAsync(cancellationToken);
            return Results.Ok(payload);
        });

        stations.MapGet("/{key}", async (string key, IStationService stationService, CancellationToken cancellationToken) =>
        {
            var payload = await stationService.GetStationAsync(key, cancellationToken);
            return payload is null
                ? Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found.")
                : Results.Ok(payload);
        });

        stations.MapGet("/{key}/now-playing", async (string key, IMetadataService metadataService, CancellationToken cancellationToken) =>
        {
            var result = await metadataService.GetNowPlayingAsync(key, cancellationToken);

            return result.Availability switch
            {
                MetadataAvailability.Available when result.Payload is not null => Results.Ok(result.Payload),
                MetadataAvailability.Unavailable => Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Metadata provider unavailable.",
                    detail: "Audio playback can continue, but current track data is temporarily unavailable."),
                _ => Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found.")
            };
        });

        return api;
    }
}
