using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class AuditLog : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Date { get; set; } = "";
    public string Time { get; set; } = "";
    public string UserName { get; set; } = "";
    public string ActionType { get; set; } = "";
    public string Details { get; set; } = "";
    public int Count { get; set; }
    public string Stage { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
