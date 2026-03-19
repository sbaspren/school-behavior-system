using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

/// <summary>
/// قالب رسالة — مطابق لـ msg_template_{type} في PropertiesService (Server_Templates.gs)
/// </summary>
public class MessageTemplate : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Type { get; set; } = "";       // نوع: مخالفة، تأخر، غياب، استئذان، ملاحظة
    public string Content { get; set; } = "";     // نص القالب
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
