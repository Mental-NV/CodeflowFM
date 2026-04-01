using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using webapi.Contracts;

namespace CodeflowFM.Tests;

public sealed class ApiIntegrationTests(CodeflowWebApplicationFactory factory) : IClassFixture<CodeflowWebApplicationFactory>
{
    [Fact]
    public async Task StationsEndpointReturnsSeededEditorialOrder()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateClient();

        var stations = await client.GetFromJsonAsync<List<StationSummaryDto>>("/api/v1/stations");

        Assert.NotNull(stations);
        Assert.Equal(15, stations.Count);
        Assert.Equal("ambient", stations[0].Key);
        Assert.Equal("chillhop", stations[1].Key);
        Assert.Equal("vocal-chillout", stations[^1].Key);
    }

    [Fact]
    public async Task UnknownStationReturnsNotFound()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/stations/unknown-station");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpointsRequireAuthentication()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GoogleBootstrapCreatesUserAndReturnsSessionData()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateAuthorizedClient();

        var response = await client.PostAsync("/api/v1/auth/google", content: null);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<AuthBootstrapResponse>();

        Assert.NotNull(payload);
        Assert.Equal("listener@example.com", payload.User.Email);
        Assert.Equal(0.72d, payload.Preferences.Volume);
        Assert.Empty(payload.RecentStations);
    }

    [Fact]
    public async Task PreferencesRoundTripPersistsForAuthenticatedUser()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateAuthorizedClient();

        var updatePayload = new UpdatePreferencesRequest("minimal", 0.4d, true, "dark");
        var updateResponse = await client.PutAsJsonAsync("/api/v1/me/preferences", updatePayload);
        updateResponse.EnsureSuccessStatusCode();

        var persisted = await client.GetFromJsonAsync<UserPreferenceDto>("/api/v1/me/preferences");

        Assert.NotNull(persisted);
        Assert.Equal("minimal", persisted.LastStationKey);
        Assert.Equal(0.4d, persisted.Volume);
        Assert.True(persisted.IsMuted);
    }

    [Fact]
    public async Task RecentStationsAddTrimAndClear()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateAuthorizedClient();

        var keys = new[]
        {
            "ambient", "chillhop", "chillout", "chillout-dreams", "chillstep",
            "downtempo-lounge", "future-garage", "lofi-hip-hop", "lofi-lounge-chill", "lounge",
            "minimal"
        };

        foreach (var key in keys)
        {
            var response = await client.PostAsJsonAsync("/api/v1/me/recent-stations", new AddRecentStationRequest(key));
            response.EnsureSuccessStatusCode();
        }

        var recents = await client.GetFromJsonAsync<List<RecentStationDto>>("/api/v1/me/recent-stations");

        Assert.NotNull(recents);
        Assert.Equal(10, recents.Count);
        Assert.Equal("minimal", recents[0].StationKey);
        Assert.DoesNotContain(recents, recent => recent.StationKey == "ambient");

        var clearResponse = await client.DeleteAsync("/api/v1/me/recent-stations");
        Assert.Equal(HttpStatusCode.NoContent, clearResponse.StatusCode);

        var clearedRecents = await client.GetFromJsonAsync<List<RecentStationDto>>("/api/v1/me/recent-stations");
        Assert.NotNull(clearedRecents);
        Assert.Empty(clearedRecents);
    }

    [Fact]
    public async Task HealthEndpointReportsHealthyAndDegradedMetadata()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateClient();
        var healthyResponse = await client.GetAsync("/api/v1/health");
        healthyResponse.EnsureSuccessStatusCode();

        await using var degradedFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Metadata:ProviderAvailable"] = "false"
                });
            });
        });

        using var degradedClient = degradedFactory.CreateClient();
        var degradedResponse = await degradedClient.GetAsync("/api/v1/health");

        Assert.Equal(HttpStatusCode.OK, healthyResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, degradedResponse.StatusCode);
        var degradedBody = await degradedResponse.Content.ReadAsStringAsync();
        Assert.Contains("Degraded", degradedBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RootAndDeepLinksServeSpaShell()
    {
        await factory.ResetStateAsync();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var rootHtml = await client.GetStringAsync("/");
        var recentHtml = await client.GetStringAsync("/recent");
        var apiResponse = await client.GetAsync("/api/v1/stations");

        Assert.Contains("Codeflow FM test shell", rootHtml);
        Assert.Contains("Codeflow FM test shell", recentHtml);
        Assert.Equal("application/json; charset=utf-8", apiResponse.Content.Headers.ContentType?.ToString());
    }
}
