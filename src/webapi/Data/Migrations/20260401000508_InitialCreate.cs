using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webapi.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        private static readonly string[] RecentStationsUserProfileStationColumns = ["UserProfileId", "StationId"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Stations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Key = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Descriptor = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    StreamUrl = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ArtworkUrl = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    AccentColor = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    SecondaryAccentColor = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Mood = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    GoogleSubject = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    AvatarUrl = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecentStations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PlayedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecentStations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecentStations_Stations_StationId",
                        column: x => x.StationId,
                        principalTable: "Stations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecentStations_UserProfiles_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "UserProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPreferences",
                columns: table => new
                {
                    UserProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LastStationKey = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    Volume = table.Column<double>(type: "REAL", nullable: false),
                    IsMuted = table.Column<bool>(type: "INTEGER", nullable: false),
                    Theme = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreferences", x => x.UserProfileId);
                    table.ForeignKey(
                        name: "FK_UserPreferences_UserProfiles_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "UserProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecentStations_StationId",
                table: "RecentStations",
                column: "StationId");

            migrationBuilder.CreateIndex(
                name: "IX_RecentStations_UserProfileId_StationId",
                table: "RecentStations",
                columns: RecentStationsUserProfileStationColumns,
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stations_Key",
                table: "Stations",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserProfiles_Email",
                table: "UserProfiles",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_UserProfiles_GoogleSubject",
                table: "UserProfiles",
                column: "GoogleSubject",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecentStations");

            migrationBuilder.DropTable(
                name: "UserPreferences");

            migrationBuilder.DropTable(
                name: "Stations");

            migrationBuilder.DropTable(
                name: "UserProfiles");
        }
    }
}
