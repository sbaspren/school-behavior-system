using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class Subject : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
