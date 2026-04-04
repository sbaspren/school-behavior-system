using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class CommitteeMember : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;

    public int CommitteeId { get; set; }
    public Committee Committee { get; set; } = null!;

    public string PersonName { get; set; } = "";
    public string PersonRole { get; set; } = "";      // الرئيس / عضو / أمين السر
    public string JobTitle { get; set; } = "";         // مدير المدرسة / موجه طلابي / معلم
    public int SortOrder { get; set; }
}
