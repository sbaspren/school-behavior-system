using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class PermissionRecord : ITenantEntity, IStudentRecord
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public int StudentId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Grade { get; set; } = "";
    public string Class { get; set; } = "";
    public Stage Stage { get; set; }
    public string Mobile { get; set; } = "";
    public string ExitTime { get; set; } = "";           // وقت الخروج
    public string Reason { get; set; } = "";             // السبب
    public string Receiver { get; set; } = "";           // المستلم
    public string Supervisor { get; set; } = "";         // المسؤول
    public string HijriDate { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public string ConfirmationTime { get; set; } = "";   // وقت التأكيد
    public bool IsSent { get; set; }
    public int Semester { get; set; } = 1;               // الفصل الدراسي
    public string AcademicYear { get; set; } = "";       // السنة الهجرية

    public Student Student { get; set; } = null!;
}
