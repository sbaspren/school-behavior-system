namespace SchoolBehaviorSystem.Domain.Enums;

public enum TenantStatus
{
    Unused,     // كود لم يُستخدم بعد
    Active,     // اشتراك فعّال
    Expired,    // اشتراك منتهي
    Revoked     // ملغي
}
