using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolBehaviorSystem.Infrastructure.Migrations
{
    /// <summary>
    /// إضافة عزل الفصل الدراسي — Semester (1/2) + AcademicYear ("1447")
    /// لكل جداول السجلات + إعدادات المدرسة + الغياب التراكمي
    /// </summary>
    public partial class AddSemesterIsolation : Migration
    {
        // الجداول التي تحتاج Semester + AcademicYear
        private static readonly string[] RecordTables = new[]
        {
            "violations", "daily_absences", "tardiness_records",
            "permission_records", "educational_notes", "positive_behaviors",
            "communication_logs", "cumulative_absences"
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. إضافة الأعمدة لكل جدول سجلات ──
            foreach (var table in RecordTables)
            {
                migrationBuilder.AddColumn<int>(
                    name: "Semester",
                    table: table,
                    type: "int",
                    nullable: false,
                    defaultValue: 1);

                migrationBuilder.AddColumn<string>(
                    name: "AcademicYear",
                    table: table,
                    type: "varchar(10)",
                    maxLength: 10,
                    nullable: false,
                    defaultValue: "")
                    .Annotation("MySql:CharSet", "utf8mb4");
            }

            // ── 2. إضافة الأعمدة لإعدادات المدرسة ──
            migrationBuilder.AddColumn<int>(
                name: "CurrentSemester",
                table: "school_settings",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "CurrentAcademicYear",
                table: "school_settings",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── 3. فهارس مركبة (Semester, AcademicYear) لتسريع الاستعلامات ──
            foreach (var table in RecordTables)
            {
                if (table == "cumulative_absences") continue; // سيُعالج أدناه
                migrationBuilder.CreateIndex(
                    name: $"IX_{table}_Semester_AcademicYear",
                    table: table,
                    columns: new[] { "Semester", "AcademicYear" });
            }

            // ── 4. تحديث فهرس CumulativeAbsence الفريد ──
            // حذف القديم
            migrationBuilder.DropIndex(
                name: "IX_cumulative_absences_StudentId_Stage",
                table: "cumulative_absences");

            // إنشاء الجديد مع Semester + AcademicYear
            migrationBuilder.CreateIndex(
                name: "IX_cumulative_absences_StudentId_Stage_Semester_AcademicYear",
                table: "cumulative_absences",
                columns: new[] { "StudentId", "Stage", "Semester", "AcademicYear" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── إزالة فهرس CumulativeAbsence الجديد وإعادة القديم ──
            migrationBuilder.DropIndex(
                name: "IX_cumulative_absences_StudentId_Stage_Semester_AcademicYear",
                table: "cumulative_absences");

            migrationBuilder.CreateIndex(
                name: "IX_cumulative_absences_StudentId_Stage",
                table: "cumulative_absences",
                columns: new[] { "StudentId", "Stage" },
                unique: true);

            // ── إزالة الفهارس المركبة ──
            foreach (var table in RecordTables)
            {
                if (table == "cumulative_absences") continue;
                migrationBuilder.DropIndex(
                    name: $"IX_{table}_Semester_AcademicYear",
                    table: table);
            }

            // ── إزالة أعمدة الإعدادات ──
            migrationBuilder.DropColumn(name: "CurrentSemester", table: "school_settings");
            migrationBuilder.DropColumn(name: "CurrentAcademicYear", table: "school_settings");

            // ── إزالة الأعمدة من كل الجداول ──
            foreach (var table in RecordTables)
            {
                migrationBuilder.DropColumn(name: "Semester", table: table);
                migrationBuilder.DropColumn(name: "AcademicYear", table: table);
            }
        }
    }
}
