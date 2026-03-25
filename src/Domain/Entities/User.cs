using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class User : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Name { get; set; } = "";
    public UserRole Role { get; set; }
    public string Mobile { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Permissions { get; set; } = "";
    public string ScopeType { get; set; } = "all";     // all, stage, grade, class
    public string ScopeValue { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public string TokenLink { get; set; } = "";
    public string LinkUrl { get; set; } = "";
    public bool HasWhatsApp { get; set; }
    public string WhatsAppPhone { get; set; } = "";
    public bool CanUseAdminWhatsApp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
