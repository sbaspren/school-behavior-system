using SchoolBehaviorSystem.Domain.Enums;

namespace SchoolBehaviorSystem.Domain.Entities;

/// <summary>
/// المشترك/المدرسة - كل كود تفعيل = Tenant واحد.
/// </summary>
public class Tenant
{
    public int Id { get; set; }
    public string Code { get; set; } = "";              // SCH-2026-XXXX-XXXX
    public string SchoolName { get; set; } = "";         // يُملأ عند التفعيل
    public string AdminName { get; set; } = "";          // اسم المدير - يُملأ عند التفعيل
    public string AdminPhone { get; set; } = "";         // جوال المدير
    public LicensePlan Plan { get; set; } = LicensePlan.Trial;
    public TenantStatus Status { get; set; } = TenantStatus.Unused;
    public int DurationDays { get; set; } = 14;          // مدة الاشتراك بالأيام
    public decimal Amount { get; set; } = 0;             // المبلغ المدفوع
    public bool IsPaid { get; set; } = false;             // هل تم الدفع؟
    public string Notes { get; set; } = "";              // ملاحظات (تحويل بنكي، إلخ)
    public DateTime? ActivatedAt { get; set; }           // تاريخ التفعيل
    public DateTime? ExpiresAt { get; set; }             // تاريخ الانتهاء
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
