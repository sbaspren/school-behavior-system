using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class TardinessRecord : ITenantEntity, IStudentRecord
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
    public TardinessType TardinessType { get; set; }
    public string Period { get; set; } = "";             // الحصة
    public string HijriDate { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public bool IsSent { get; set; }
    public int Semester { get; set; } = 1;               // الفصل الدراسي
    public string AcademicYear { get; set; } = "";       // السنة الهجرية
    public string NoorStatus { get; set; } = "";         // حالة نور
    public DateTime? NoorDocumentedAt { get; set; }      // تاريخ التوثيق في نور

    public Student Student { get; set; } = null!;
}
