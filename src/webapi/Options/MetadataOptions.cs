namespace webapi.Options;

public sealed class MetadataOptions
{
    public const string SectionName = "Metadata";

    public bool ProviderAvailable { get; init; } = true;
}
