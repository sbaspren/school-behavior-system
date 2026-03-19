using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class ParentAccessCode : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Code { get; set; } = "";
    public string StudentNumber { get; set; } = "";
    public Stage Stage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
}
