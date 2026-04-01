namespace webapi.Data;

public sealed class Station
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Descriptor { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
    public string? ArtworkUrl { get; set; }
    public string AccentColor { get; set; } = string.Empty;
    public string SecondaryAccentColor { get; set; } = string.Empty;
    public string Mood { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RecentStation> RecentStations { get; set; } = [];
}

public sealed class UserProfile
{
    public Guid Id { get; set; }
    public string GoogleSubject { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserPreference Preference { get; set; } = null!;
    public ICollection<RecentStation> RecentStations { get; set; } = [];
}

public sealed class UserPreference
{
    public Guid UserProfileId { get; set; }
    public UserProfile UserProfile { get; set; } = null!;
    public string? LastStationKey { get; set; }
    public double Volume { get; set; }
    public bool IsMuted { get; set; }
    public string Theme { get; set; } = "dark";
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class RecentStation
{
    public Guid Id { get; set; }
    public Guid UserProfileId { get; set; }
    public UserProfile UserProfile { get; set; } = null!;
    public Guid StationId { get; set; }
    public Station Station { get; set; } = null!;
    public DateTimeOffset PlayedAt { get; set; }
}
