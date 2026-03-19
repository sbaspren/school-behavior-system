using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class Committee : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Name { get; set; } = "";
    public string Members { get; set; } = "";            // comma-separated
    public bool IsActive { get; set; } = true;
}
