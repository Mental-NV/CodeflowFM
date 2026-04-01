namespace webapi.Options;

public sealed class StationCatalogOptions
{
    public const string SectionName = "StationCatalog";

    public List<StationCatalogStationOptions> Stations { get; init; } = [];
}

public sealed class StationCatalogStationOptions
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Descriptor { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string StreamUrl { get; init; } = string.Empty;
    public string? ArtworkUrl { get; init; }
    public string AccentColor { get; init; } = string.Empty;
    public string SecondaryAccentColor { get; init; } = string.Empty;
    public string Mood { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
    public List<StationTrackOptions> Tracks { get; init; } = [];
}

public sealed class StationTrackOptions
{
    public string Title { get; init; } = string.Empty;
    public string Artist { get; init; } = string.Empty;
    public int DurationSeconds { get; init; } = 240;
}
