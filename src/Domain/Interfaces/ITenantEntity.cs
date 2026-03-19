namespace SchoolBehaviorSystem.Domain.Interfaces;

/// <summary>
/// كل Entity ينتمي لمدرسة (Tenant) يجب أن يرث هذا الـ Interface.
/// الآن: TenantId = 1 دائماً (Single-Tenant)
/// لاحقاً: TenantId ديناميكي من JWT (Multi-Tenant) بدون تعديل أي Controller.
/// </summary>
public interface ITenantEntity
{
    int TenantId { get; set; }
}
