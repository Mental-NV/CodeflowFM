namespace webapi.Contracts;

public sealed record StationSummaryDto(
    string Key,
    string Name,
    string Descriptor,
    string Description,
    string StreamUrl,
    string? ArtworkUrl,
    string AccentColor,
    string SecondaryAccentColor,
    string Mood,
    int SortOrder);

public sealed record StationDetailDto(
    string Key,
    string Name,
    string Descriptor,
    string Description,
    string StreamUrl,
    string? ArtworkUrl,
    string AccentColor,
    string SecondaryAccentColor,
    string Mood,
    int SortOrder,
    bool IsActive);

public sealed record NowPlayingDto(
    string StationKey,
    string StationName,
    string? TrackTitle,
    string? ArtistName,
    string? ArtworkUrl,
    DateTimeOffset? StartedAt,
    int? DurationSeconds,
    DateTimeOffset FetchedAt,
    bool IsLive);

public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? AvatarUrl);

public sealed record UserPreferenceDto(
    string? LastStationKey,
    double Volume,
    bool IsMuted,
    string Theme,
    DateTimeOffset UpdatedAt);

public sealed record RecentStationDto(
    string StationKey,
    string StationName,
    string Descriptor,
    string AccentColor,
    DateTimeOffset PlayedAt);

public sealed record AuthBootstrapResponse(
    UserProfileDto User,
    UserPreferenceDto Preferences,
    IReadOnlyList<RecentStationDto> RecentStations);

public sealed record UpdatePreferencesRequest(
    string? LastStationKey,
    double Volume,
    bool IsMuted,
    string Theme = "dark");

public sealed record AddRecentStationRequest(string StationKey);
