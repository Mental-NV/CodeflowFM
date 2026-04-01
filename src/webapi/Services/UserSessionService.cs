using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using webapi.Contracts;
using webapi.Data;

namespace webapi.Services;

public interface IUserSessionService
{
    Task<AuthBootstrapResponse> GetBootstrapAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
    Task<UserProfileDto> GetProfileAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
    Task<UserPreferenceDto> GetPreferencesAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
    Task<UserPreferenceDto> UpdatePreferencesAsync(ClaimsPrincipal principal, UpdatePreferencesRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<RecentStationDto>> GetRecentStationsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
    Task<IReadOnlyList<RecentStationDto>> AddRecentStationAsync(ClaimsPrincipal principal, AddRecentStationRequest request, CancellationToken cancellationToken);
    Task ClearRecentStationsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
}

public sealed class UserSessionService(
    AppDbContext dbContext,
    IStationService stationService) : IUserSessionService
{
    public async Task<AuthBootstrapResponse> GetBootstrapAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var user = await EnsureUserAsync(principal, cancellationToken);
        return new AuthBootstrapResponse(
            MapUser(user),
            MapPreference(user.Preference),
            await LoadRecentStationsAsync(user.Id, cancellationToken));
    }

    public async Task<UserProfileDto> GetProfileAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var user = await EnsureUserAsync(principal, cancellationToken);
        return MapUser(user);
    }

    public async Task<UserPreferenceDto> GetPreferencesAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var user = await EnsureUserAsync(principal, cancellationToken);
        return MapPreference(user.Preference);
    }

    public async Task<UserPreferenceDto> UpdatePreferencesAsync(
        ClaimsPrincipal principal,
        UpdatePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Volume is < 0 or > 1)
        {
            throw new ArgumentOutOfRangeException(nameof(request));
        }

        if (!string.IsNullOrWhiteSpace(request.LastStationKey) &&
            !await stationService.StationExistsAsync(request.LastStationKey, cancellationToken))
        {
            throw new KeyNotFoundException("Station not found.");
        }

        var user = await EnsureUserAsync(principal, cancellationToken);
        user.Preference.LastStationKey = string.IsNullOrWhiteSpace(request.LastStationKey)
            ? null
            : request.LastStationKey.Trim().ToLowerInvariant();
        user.Preference.Volume = request.Volume;
        user.Preference.IsMuted = request.IsMuted;
        user.Preference.Theme = string.IsNullOrWhiteSpace(request.Theme) ? "dark" : request.Theme.Trim().ToLowerInvariant();

        await dbContext.SaveChangesAsync(cancellationToken);
        return MapPreference(user.Preference);
    }

    public async Task<IReadOnlyList<RecentStationDto>> GetRecentStationsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var user = await EnsureUserAsync(principal, cancellationToken);
        return await LoadRecentStationsAsync(user.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<RecentStationDto>> AddRecentStationAsync(
        ClaimsPrincipal principal,
        AddRecentStationRequest request,
        CancellationToken cancellationToken)
    {
        var station = await stationService.GetActiveStationEntityAsync(request.StationKey, cancellationToken)
            ?? throw new KeyNotFoundException("Station not found.");

        var user = await EnsureUserAsync(principal, cancellationToken);
        var existing = await dbContext.RecentStations
            .SingleOrDefaultAsync(
                recent => recent.UserProfileId == user.Id && recent.StationId == station.Id,
                cancellationToken);

        if (existing is null)
        {
            dbContext.RecentStations.Add(new RecentStation
            {
                Id = Guid.NewGuid(),
                UserProfileId = user.Id,
                StationId = station.Id,
                PlayedAt = DateTimeOffset.UtcNow
            });
        }
        else
        {
            existing.PlayedAt = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var overflowIds = (await dbContext.RecentStations
            .Where(recent => recent.UserProfileId == user.Id)
            .Select(recent => new { recent.Id, recent.PlayedAt })
            .ToListAsync(cancellationToken))
            .OrderByDescending(recent => recent.PlayedAt)
            .Skip(10)
            .Select(recent => recent.Id)
            .ToList();

        if (overflowIds.Count > 0)
        {
            await dbContext.RecentStations
                .Where(recent => overflowIds.Contains(recent.Id))
                .ExecuteDeleteAsync(cancellationToken);
        }

        return await LoadRecentStationsAsync(user.Id, cancellationToken);
    }

    public async Task ClearRecentStationsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var user = await EnsureUserAsync(principal, cancellationToken);

        await dbContext.RecentStations
            .Where(recent => recent.UserProfileId == user.Id)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<UserProfile> EnsureUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var subject = principal.FindFirstValue("sub") ?? throw new InvalidOperationException("Authenticated user is missing the Google subject claim.");
        var email = principal.FindFirstValue("email") ?? throw new InvalidOperationException("Authenticated user is missing the email claim.");
        var displayName = principal.FindFirstValue("name") ?? email;
        var avatarUrl = principal.FindFirstValue("picture");

        var user = await dbContext.UserProfiles
            .Include(profile => profile.Preference)
            .SingleOrDefaultAsync(profile => profile.GoogleSubject == subject, cancellationToken);

        if (user is null)
        {
            user = new UserProfile
            {
                Id = Guid.NewGuid(),
                GoogleSubject = subject,
                Email = email,
                DisplayName = displayName,
                AvatarUrl = avatarUrl,
                Preference = new UserPreference
                {
                    Volume = 0.72,
                    IsMuted = false,
                    Theme = "dark"
                }
            };

            dbContext.UserProfiles.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
            return user;
        }

        var changed = user.Email != email ||
            user.DisplayName != displayName ||
            user.AvatarUrl != avatarUrl;

        if (changed)
        {
            user.Email = email;
            user.DisplayName = displayName;
            user.AvatarUrl = avatarUrl;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return user;
    }

    private async Task<IReadOnlyList<RecentStationDto>> LoadRecentStationsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var recentStations = await dbContext.RecentStations
            .AsNoTracking()
            .Where(recent => recent.UserProfileId == userId)
            .Include(recent => recent.Station)
            .ToListAsync(cancellationToken);

        return recentStations
            .OrderByDescending(recent => recent.PlayedAt)
            .Select(recent => new RecentStationDto(
                recent.Station.Key,
                recent.Station.Name,
                recent.Station.Descriptor,
                recent.Station.AccentColor,
                recent.PlayedAt))
            .ToList();
    }

    private static UserProfileDto MapUser(UserProfile user) =>
        new(user.Id, user.Email, user.DisplayName, user.AvatarUrl);

    private static UserPreferenceDto MapPreference(UserPreference preference) =>
        new(preference.LastStationKey, preference.Volume, preference.IsMuted, preference.Theme, preference.UpdatedAt);
}
