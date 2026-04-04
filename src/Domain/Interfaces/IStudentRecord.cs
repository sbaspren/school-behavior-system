using SchoolBehaviorSystem.Domain.Enums;

namespace SchoolBehaviorSystem.Domain.Interfaces;

/// <summary>
/// Common fields shared by all student-related record entities
/// (Violation, TardinessRecord, PermissionRecord, DailyAbsence).
/// Used by RecordControllerBase to apply generic filtering.
/// </summary>
public interface IStudentRecord
{
    int Id { get; set; }
    int StudentId { get; set; }
    string StudentNumber { get; set; }
    string StudentName { get; set; }
    string Grade { get; set; }
    string Class { get; set; }
    Stage Stage { get; set; }
    string HijriDate { get; set; }
    string RecordedBy { get; set; }
    DateTime RecordedAt { get; set; }
    bool IsSent { get; set; }
    int Semester { get; set; }
    string AcademicYear { get; set; }
}
