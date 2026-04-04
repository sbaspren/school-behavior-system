using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolBehaviorSystem.Infrastructure.Migrations
{
    public partial class AddCommitteeMembersAndMeetings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add CommitteeType column to existing committees table
            migrationBuilder.AddColumn<string>(
                name: "CommitteeType",
                table: "committees",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            // Create committee_members table
            migrationBuilder.CreateTable(
                name: "committee_members",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TenantId = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    CommitteeId = table.Column<int>(type: "int", nullable: false),
                    PersonName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, defaultValue: ""),
                    PersonRole = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, defaultValue: ""),
                    JobTitle = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, defaultValue: ""),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_committee_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_committee_members_committees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "committees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_committee_members_CommitteeId",
                table: "committee_members",
                column: "CommitteeId");

            // Create committee_meetings table
            migrationBuilder.CreateTable(
                name: "committee_meetings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TenantId = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    CommitteeId = table.Column<int>(type: "int", nullable: false),
                    MeetingNumber = table.Column<int>(type: "int", nullable: false),
                    MeetingDate = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, defaultValue: ""),
                    HijriDate = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, defaultValue: ""),
                    DayName = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, defaultValue: ""),
                    StartTime = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: ""),
                    EndTime = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: ""),
                    Location = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, defaultValue: "المدرسة"),
                    GoalsJson = table.Column<string>(type: "longtext", nullable: false, defaultValue: "[]"),
                    AgendaJson = table.Column<string>(type: "longtext", nullable: false, defaultValue: "[]"),
                    DecisionsJson = table.Column<string>(type: "longtext", nullable: false, defaultValue: "[]"),
                    Notes = table.Column<string>(type: "longtext", nullable: false, defaultValue: ""),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_committee_meetings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_committee_meetings_committees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "committees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_committee_meetings_CommitteeId_MeetingNumber",
                table: "committee_meetings",
                columns: new[] { "CommitteeId", "MeetingNumber" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "committee_meetings");
            migrationBuilder.DropTable(name: "committee_members");
            migrationBuilder.DropColumn(name: "CommitteeType", table: "committees");
        }
    }
}
