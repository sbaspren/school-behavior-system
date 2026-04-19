using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class WhatsAppSession : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;

    // ★ ربط الجلسة بالمستخدم الذي ربط رقمه. Nullable للتوافق مع:
    // - الجلسات القديمة (قبل الميزة)
    // - الوضع الموحد حيث رقم المدرسة غير مربوط بمستخدم محدد
    public int? UserId { get; set; }
    public User? User { get; set; }

    public string PhoneNumber { get; set; } = "";
    public string Stage { get; set; } = "";
    public string UserType { get; set; } = "";
    public string ConnectionStatus { get; set; } = "";
    public DateTime? LinkedAt { get; set; }
    public DateTime? LastUsed { get; set; }
    public int MessageCount { get; set; }
    public bool IsPrimary { get; set; }
}
