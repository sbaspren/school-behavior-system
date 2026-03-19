using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class SchoolSettings : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string SchoolName { get; set; } = "";
    public string EduAdmin { get; set; } = "";
    public string EduDept { get; set; } = "";
    public LetterheadMode LetterheadMode { get; set; } = LetterheadMode.Text;
    public string LetterheadImageUrl { get; set; } = "";
    public string Letterhead { get; set; } = "";
    public WhatsAppMode WhatsAppMode { get; set; } = WhatsAppMode.PerStage;
    public SchoolType SchoolType { get; set; } = SchoolType.Boys;
    public SecondarySystem SecondarySystem { get; set; } = SecondarySystem.Semester;

    // طاقم العمل — مطابق لـ getSchoolSettings_ في Server_Data.gs
    public string ManagerName { get; set; } = "";
    public string DeputyName { get; set; } = "";
    public string CounselorName { get; set; } = "";
    public string CommitteeName { get; set; } = "";
    public string WakeelName { get; set; } = "";
    public string WakeelSignature { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
