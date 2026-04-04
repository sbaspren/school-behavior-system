using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class CommitteeMeeting : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;

    public int CommitteeId { get; set; }
    public Committee Committee { get; set; } = null!;

    public int MeetingNumber { get; set; }             // رقم الاجتماع (١-٦)
    public string MeetingDate { get; set; } = "";      // التاريخ الميلادي
    public string HijriDate { get; set; } = "";        // التاريخ الهجري
    public string DayName { get; set; } = "";          // اليوم (الأحد، الاثنين...)
    public string StartTime { get; set; } = "";        // وقت البداية
    public string EndTime { get; set; } = "";          // وقت النهاية
    public string Location { get; set; } = "المدرسة";

    // JSON arrays stored as strings
    public string GoalsJson { get; set; } = "[]";      // أهداف الاجتماع
    public string AgendaJson { get; set; } = "[]";     // بنود الاجتماع
    public string DecisionsJson { get; set; } = "[]";  // القرارات والتوصيات
    public string Notes { get; set; } = "";             // ملاحظات إضافية

    public string Status { get; set; } = "Draft";      // Draft / Final
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
