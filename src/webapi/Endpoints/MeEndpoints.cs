using Microsoft.AspNetCore.Authorization;
using webapi.Contracts;
using webapi.Services;

namespace webapi.Endpoints;

public static class MeEndpoints
{
    public static RouteGroupBuilder MapMeEndpoints(this RouteGroupBuilder api)
    {
        var me = api.MapGroup("/me").RequireAuthorization();

        me.MapGet("/", async (HttpContext context, IUserSessionService userSessionService, CancellationToken cancellationToken) =>
        {
            var payload = await userSessionService.GetProfileAsync(context.User, cancellationToken);
            return Results.Ok(payload);
        });

        me.MapGet("/preferences", async (HttpContext context, IUserSessionService userSessionService, CancellationToken cancellationToken) =>
        {
            var payload = await userSessionService.GetPreferencesAsync(context.User, cancellationToken);
            return Results.Ok(payload);
        });

        me.MapPut("/preferences", async (
            HttpContext context,
            UpdatePreferencesRequest request,
            IUserSessionService userSessionService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var payload = await userSessionService.UpdatePreferencesAsync(context.User, request, cancellationToken);
                return Results.Ok(payload);
            }
            catch (ArgumentOutOfRangeException)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["volume"] = ["Volume must be between 0 and 1."]
                });
            }
            catch (KeyNotFoundException)
            {
                return Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found.");
            }
        });

        me.MapGet("/recent-stations", async (HttpContext context, IUserSessionService userSessionService, CancellationToken cancellationToken) =>
        {
            var payload = await userSessionService.GetRecentStationsAsync(context.User, cancellationToken);
            return Results.Ok(payload);
        });

        me.MapPost("/recent-stations", async (
            HttpContext context,
            AddRecentStationRequest request,
            IUserSessionService userSessionService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var payload = await userSessionService.AddRecentStationAsync(context.User, request, cancellationToken);
                return Results.Ok(payload);
            }
            catch (KeyNotFoundException)
            {
                return Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Station not found.");
            }
        });

        me.MapDelete("/recent-stations", async (HttpContext context, IUserSessionService userSessionService, CancellationToken cancellationToken) =>
        {
            await userSessionService.ClearRecentStationsAsync(context.User, cancellationToken);
            return Results.NoContent();
        });

        return api;
    }
}
