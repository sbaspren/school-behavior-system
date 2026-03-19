using SchoolBehaviorSystem.Domain.Entities;

namespace SchoolBehaviorSystem.Application.Interfaces;

/// <summary>
/// خدمة المشترك/المدرسة الحالية.
/// الآن: ترجع TenantId = 1 دائماً (Single-Tenant).
/// لاحقاً: تقرأ TenantId من JWT (Multi-Tenant) بدون تعديل أي Controller.
/// </summary>
public interface ITenantService
{
    /// <summary>معرّف المدرسة الحالية</summary>
    int GetCurrentTenantId();

    /// <summary>بيانات المدرسة الحالية</summary>
    Task<Tenant?> GetCurrentTenantAsync();

    /// <summary>هل الاشتراك فعّال؟</summary>
    Task<bool> IsSubscriptionActiveAsync();

    /// <summary>كم يوم باقي على انتهاء الاشتراك؟</summary>
    Task<int?> GetDaysRemainingAsync();
}
