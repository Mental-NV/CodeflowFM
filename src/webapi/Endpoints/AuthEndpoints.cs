using Microsoft.AspNetCore.Authorization;
using webapi.Services;

namespace webapi.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth");

        auth.MapPost("/google", [Authorize] async (HttpContext context, IUserSessionService userSessionService, CancellationToken cancellationToken) =>
        {
            var payload = await userSessionService.GetBootstrapAsync(context.User, cancellationToken);
            return Results.Ok(payload);
        });

        return api;
    }
}
