using Microsoft.EntityFrameworkCore;

namespace webapi.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Station> Stations => Set<Station>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<RecentStation> RecentStations => Set<RecentStation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Station>(builder =>
        {
            builder.ToTable("Stations");
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => x.Key).IsUnique();
            builder.Property(x => x.Key).HasMaxLength(64);
            builder.Property(x => x.Name).HasMaxLength(128);
            builder.Property(x => x.Descriptor).HasMaxLength(128);
            builder.Property(x => x.Description).HasMaxLength(512);
            builder.Property(x => x.StreamUrl).HasMaxLength(256);
            builder.Property(x => x.ArtworkUrl).HasMaxLength(256);
            builder.Property(x => x.AccentColor).HasMaxLength(16);
            builder.Property(x => x.SecondaryAccentColor).HasMaxLength(16);
            builder.Property(x => x.Mood).HasMaxLength(64);
        });

        modelBuilder.Entity<UserProfile>(builder =>
        {
            builder.ToTable("UserProfiles");
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => x.GoogleSubject).IsUnique();
            builder.HasIndex(x => x.Email);
            builder.Property(x => x.GoogleSubject).HasMaxLength(128);
            builder.Property(x => x.Email).HasMaxLength(256);
            builder.Property(x => x.DisplayName).HasMaxLength(256);
            builder.Property(x => x.AvatarUrl).HasMaxLength(512);
            builder.HasOne(x => x.Preference)
                .WithOne(x => x.UserProfile)
                .HasForeignKey<UserPreference>(x => x.UserProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPreference>(builder =>
        {
            builder.ToTable("UserPreferences");
            builder.HasKey(x => x.UserProfileId);
            builder.Property(x => x.LastStationKey).HasMaxLength(64);
            builder.Property(x => x.Theme).HasMaxLength(32);
        });

        modelBuilder.Entity<RecentStation>(builder =>
        {
            builder.ToTable("RecentStations");
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => new { x.UserProfileId, x.StationId }).IsUnique();
            builder.HasOne(x => x.UserProfile)
                .WithMany(x => x.RecentStations)
                .HasForeignKey(x => x.UserProfileId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Station)
                .WithMany(x => x.RecentStations)
                .HasForeignKey(x => x.StationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            switch (entry.Entity)
            {
                case Station station when entry.State == EntityState.Added:
                    station.CreatedAt = now;
                    station.UpdatedAt = now;
                    break;
                case Station station when entry.State == EntityState.Modified:
                    station.UpdatedAt = now;
                    break;
                case UserProfile userProfile when entry.State == EntityState.Added:
                    userProfile.CreatedAt = now;
                    userProfile.UpdatedAt = now;
                    break;
                case UserProfile userProfile when entry.State == EntityState.Modified:
                    userProfile.UpdatedAt = now;
                    break;
                case UserPreference preference when entry.State is EntityState.Added or EntityState.Modified:
                    preference.UpdatedAt = now;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
