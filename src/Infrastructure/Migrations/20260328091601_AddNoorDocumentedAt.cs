using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolBehaviorSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNoorDocumentedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "NoorDocumentedAt",
                table: "violations",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NoorDocumentedAt",
                table: "tardiness_records",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NoorDocumentedAt",
                table: "positive_behaviors",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecordedBy",
                table: "educational_notes",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "NoorDocumentedAt",
                table: "daily_absences",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_violations_RecordedAt",
                table: "violations",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_tardiness_records_RecordedAt",
                table: "tardiness_records",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_positive_behaviors_RecordedAt",
                table: "positive_behaviors",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_permission_records_RecordedAt",
                table: "permission_records",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_educational_notes_RecordedAt",
                table: "educational_notes",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_daily_absences_RecordedAt",
                table: "daily_absences",
                column: "RecordedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_violations_RecordedAt",
                table: "violations");

            migrationBuilder.DropIndex(
                name: "IX_tardiness_records_RecordedAt",
                table: "tardiness_records");

            migrationBuilder.DropIndex(
                name: "IX_positive_behaviors_RecordedAt",
                table: "positive_behaviors");

            migrationBuilder.DropIndex(
                name: "IX_permission_records_RecordedAt",
                table: "permission_records");

            migrationBuilder.DropIndex(
                name: "IX_educational_notes_RecordedAt",
                table: "educational_notes");

            migrationBuilder.DropIndex(
                name: "IX_daily_absences_RecordedAt",
                table: "daily_absences");

            migrationBuilder.DropColumn(
                name: "NoorDocumentedAt",
                table: "violations");

            migrationBuilder.DropColumn(
                name: "NoorDocumentedAt",
                table: "tardiness_records");

            migrationBuilder.DropColumn(
                name: "NoorDocumentedAt",
                table: "positive_behaviors");

            migrationBuilder.DropColumn(
                name: "RecordedBy",
                table: "educational_notes");

            migrationBuilder.DropColumn(
                name: "NoorDocumentedAt",
                table: "daily_absences");
        }
    }
}
