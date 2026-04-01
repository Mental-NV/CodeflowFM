using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using webapi.Data;
using webapi.Endpoints;
using webapi.Health;
using webapi.Middleware;
using webapi.Options;
using webapi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("station-catalog.json", optional: false, reloadOnChange: true);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "O ";
});

builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddProblemDetails();
builder.Services.Configure<StationCatalogOptions>(builder.Configuration.GetSection(StationCatalogOptions.SectionName));
builder.Services.Configure<MetadataOptions>(builder.Configuration.GetSection(MetadataOptions.SectionName));
builder.Services.Configure<GoogleIdentityOptions>(builder.Configuration.GetSection(GoogleIdentityOptions.SectionName));

var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
defaultConnectionString = NormalizeSqliteConnectionString(defaultConnectionString, builder.Environment.ContentRootPath);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(defaultConnectionString);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("SpaDevClient", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var googleIdentity = builder.Configuration.GetSection(GoogleIdentityOptions.SectionName).Get<GoogleIdentityOptions>() ?? new();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = GoogleIdentityOptions.Authority;
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = GoogleIdentityOptions.ValidIssuers,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = "name",
            RoleClaimType = "role",
            AudienceValidator = (audiences, _, _) =>
            {
                if (googleIdentity.ValidAudiences.Count == 0)
                {
                    return false;
                }

                return audiences.Any(audience => googleIdentity.ValidAudiences.Contains(audience, StringComparer.Ordinal));
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database")
    .AddCheck<MetadataProviderHealthCheck>("metadata");

builder.Services.AddCodeflowServices();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
    await initializer.InitializeAsync(CancellationToken.None);
}

app.UseExceptionHandler();
app.UseMiddleware<CorrelationIdMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseCors("SpaDevClient");
}

app.UseHttpsRedirection();

var mediaRoot = Path.Combine(app.Environment.ContentRootPath, "Media");
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(mediaRoot),
    RequestPath = "/media"
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api/v1");
api.MapStationEndpoints();
api.MapAuthEndpoints();
api.MapMeEndpoints();
api.MapGet("/health", async (HealthCheckService healthChecks, CancellationToken cancellationToken) =>
{
    var report = await healthChecks.CheckHealthAsync(cancellationToken);
    var response = new
    {
        status = report.Status.ToString(),
        checkedAt = DateTimeOffset.UtcNow,
        checks = report.Entries.ToDictionary(
            entry => entry.Key,
            entry => new
            {
                status = entry.Value.Status.ToString(),
                description = entry.Value.Description
            })
    };

    return report.Status switch
    {
        Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy => Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable),
        _ => Results.Ok(response)
    };
});

app.MapFallbackToFile("index.html");

app.Run();

static string NormalizeSqliteConnectionString(string connectionString, string contentRootPath)
{
    var builder = new SqliteConnectionStringBuilder(connectionString);
    var dataSource = builder.DataSource;

    if (string.IsNullOrWhiteSpace(dataSource) ||
        string.Equals(dataSource, ":memory:", StringComparison.OrdinalIgnoreCase))
    {
        return builder.ToString();
    }

    var normalizedPath = Path.IsPathRooted(dataSource)
        ? dataSource
        : Path.GetFullPath(Path.Combine(contentRootPath, dataSource));

    var directoryPath = Path.GetDirectoryName(normalizedPath);
    if (!string.IsNullOrWhiteSpace(directoryPath))
    {
        Directory.CreateDirectory(directoryPath);
    }

    builder.DataSource = normalizedPath;
    return builder.ToString();
}

public partial class Program;
