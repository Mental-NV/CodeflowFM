using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using webapi;
using webapi.Data;

namespace CodeflowFM.Tests;

public sealed class CodeflowWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"codeflowfm-tests-{Guid.NewGuid():N}.db");
    private readonly string _webRootPath = Path.Combine(Path.GetTempPath(), $"codeflowfm-webroot-{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting(WebHostDefaults.WebRootKey, _webRootPath);

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_databasePath}",
                ["Authentication:Google:ValidAudiences:0"] = "test-audience.apps.googleusercontent.com",
                ["Metadata:ProviderAvailable"] = "true"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }

    public async Task InitializeAsync()
    {
        Directory.CreateDirectory(_webRootPath);
        await File.WriteAllTextAsync(
            Path.Combine(_webRootPath, "index.html"),
            "<!doctype html><html><body>Codeflow FM test shell</body></html>");
    }

    Task IAsyncLifetime.DisposeAsync()
    {
        try
        {
            if (File.Exists(_databasePath))
            {
                File.Delete(_databasePath);
            }

            if (Directory.Exists(_webRootPath))
            {
                Directory.Delete(_webRootPath, recursive: true);
            }
        }
        catch
        {
            // The OS can briefly hold sqlite file handles after test teardown.
        }

        Dispose();
        return Task.CompletedTask;
    }

    public HttpClient CreateAuthorizedClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", TestAuthHandler.TokenValue);
        return client;
    }

    public async Task ResetStateAsync()
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.RecentStations.ExecuteDeleteAsync();
        await dbContext.UserPreferences.ExecuteDeleteAsync();
        await dbContext.UserProfiles.ExecuteDeleteAsync();
    }
}
