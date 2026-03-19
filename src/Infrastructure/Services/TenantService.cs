using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.Infrastructure.Services;

/// <summary>
/// الآن: Single-Tenant — يرجع TenantId = 1 دائماً (أو أول Tenant موجود).
/// لاحقاً للـ Multi-Tenant: غيّر GetCurrentTenantId() ليقرأ من JWT claim "tenant_id".
/// </summary>
public class TenantService : ITenantService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContext;

    public TenantService(AppDbContext db, IHttpContextAccessor httpContext)
    {
        _db = db;
        _httpContext = httpContext;
    }

    public int GetCurrentTenantId()
    {
        // ★ Multi-Tenant: غيّر هذا السطر فقط ليقرأ من JWT
        // var claim = _httpContext.HttpContext?.User?.FindFirst("tenant_id");
        // return claim != null ? int.Parse(claim.Value) : 1;

        // Single-Tenant: دائماً 1
        return 1;
    }

    public async Task<Tenant?> GetCurrentTenantAsync()
    {
        var tenantId = GetCurrentTenantId();
        return await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
    }

    public async Task<bool> IsSubscriptionActiveAsync()
    {
        var tenant = await GetCurrentTenantAsync();
        if (tenant == null) return false;
        return tenant.Status == TenantStatus.Active && tenant.ExpiresAt > DateTime.UtcNow;
    }

    public async Task<int?> GetDaysRemainingAsync()
    {
        var tenant = await GetCurrentTenantAsync();
        if (tenant?.ExpiresAt == null) return null;
        var remaining = (tenant.ExpiresAt.Value - DateTime.UtcNow).Days;
        return remaining < 0 ? 0 : remaining;
    }
}
