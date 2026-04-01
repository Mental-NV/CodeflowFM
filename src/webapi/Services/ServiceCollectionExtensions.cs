using webapi.Data;

namespace webapi.Services;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCodeflowServices(this IServiceCollection services)
    {
        services.AddScoped<DatabaseInitializer>();
        services.AddScoped<IStationService, StationService>();
        services.AddScoped<IMetadataService, MetadataService>();
        services.AddScoped<IUserSessionService, UserSessionService>();

        return services;
    }
}
