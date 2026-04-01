namespace webapi.Options;

public sealed class GoogleIdentityOptions
{
    public const string SectionName = "Authentication:Google";
    public const string Authority = "https://accounts.google.com";
    public static readonly string[] ValidIssuers =
    [
        "https://accounts.google.com",
        "accounts.google.com"
    ];

    public List<string> ValidAudiences { get; init; } = [];
}
