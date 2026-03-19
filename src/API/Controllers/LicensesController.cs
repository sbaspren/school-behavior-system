using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LicensesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _authService;
    private readonly IConfiguration _config;

    public LicensesController(AppDbContext db, IAuthService authService, IConfiguration config)
    {
        _db = db;
        _authService = authService;
        _config = config;
    }

    // ── هل النظام يحتاج إعداد أولي؟ (عام - بدون تسجيل دخول) ──
    [HttpGet("check-setup")]
    public async Task<ActionResult<ApiResponse<object>>> CheckSetup()
    {
        var hasUsers = await _db.Users.AnyAsync();
        var hasTenant = await _db.Tenants.AnyAsync(t => t.Status == TenantStatus.Active);
        return Ok(ApiResponse<object>.Ok(new
        {
            needsSetup = !hasUsers || !hasTenant,
            hasUsers,
            hasTenant
        }));
    }

    // ── تفعيل كود + إنشاء حساب المدير (عام - بدون تسجيل دخول) ──
    [HttpPost("activate")]
    public async Task<ActionResult<ApiResponse<object>>> Activate([FromBody] ActivateRequest req)
    {
        // التحقق من المدخلات
        if (string.IsNullOrWhiteSpace(req.Code))
            return Ok(ApiResponse<object>.Fail("كود التفعيل مطلوب"));
        if (string.IsNullOrWhiteSpace(req.AdminName))
            return Ok(ApiResponse<object>.Fail("اسم المدير مطلوب"));
        if (string.IsNullOrWhiteSpace(req.AdminPhone) || !System.Text.RegularExpressions.Regex.IsMatch(req.AdminPhone, @"^05\d{8}$"))
            return Ok(ApiResponse<object>.Fail("رقم الجوال غير صحيح (05XXXXXXXX)"));
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6)
            return Ok(ApiResponse<object>.Fail("كلمة المرور يجب أن تكون 6 أحرف على الأقل"));

        // البحث عن الكود
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == req.Code.Trim());
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("كود التفعيل غير صحيح"));
        if (tenant.Status != TenantStatus.Unused)
            return Ok(ApiResponse<object>.Fail("هذا الكود مُستخدم مسبقاً"));

        // تفعيل الاشتراك
        tenant.Status = TenantStatus.Active;
        tenant.AdminName = req.AdminName.Trim();
        tenant.AdminPhone = req.AdminPhone.Trim();
        tenant.SchoolName = req.SchoolName?.Trim() ?? "";
        tenant.ActivatedAt = DateTime.UtcNow;
        tenant.ExpiresAt = DateTime.UtcNow.AddDays(tenant.DurationDays);
        tenant.UpdatedAt = DateTime.UtcNow;

        // إنشاء حساب المدير
        var admin = new User
        {
            Name = req.AdminName.Trim(),
            Role = UserRole.Admin,
            Mobile = req.AdminPhone.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            ScopeType = "all",
            IsActive = true,
            TenantId = tenant.Id,
            TokenLink = Guid.NewGuid().ToString("N")[..16],
        };
        _db.Users.Add(admin);

        // إنشاء إعدادات مدرسة افتراضية
        if (!await _db.SchoolSettings.AnyAsync(s => s.TenantId == tenant.Id))
        {
            _db.SchoolSettings.Add(new SchoolSettings
            {
                SchoolName = req.SchoolName?.Trim() ?? "مدرسة جديدة",
                EduAdmin = "",
                EduDept = "",
                TenantId = tenant.Id,
            });
        }

        await _db.SaveChangesAsync();

        // تسجيل دخول تلقائي
        var loginResult = await _authService.LoginAsync(req.AdminPhone.Trim(), req.Password);
        if (!loginResult.Success)
            return Ok(ApiResponse<object>.Fail("تم التفعيل لكن فشل تسجيل الدخول التلقائي - ادخل يدوياً"));

        return Ok(ApiResponse<object>.Ok(new
        {
            token = loginResult.Token,
            user = new
            {
                id = loginResult.User!.Id,
                name = loginResult.User.Name,
                role = loginResult.User.Role.ToString(),
                mobile = loginResult.User.Mobile,
                scopeType = loginResult.User.ScopeType,
                scopeValue = loginResult.User.ScopeValue
            },
            tenant = new
            {
                schoolName = tenant.SchoolName,
                plan = tenant.Plan.ToString(),
                expiresAt = tenant.ExpiresAt,
                daysRemaining = tenant.DurationDays
            }
        }, "تم تفعيل النظام بنجاح!"));
    }

    // ── حالة الاشتراك الحالي (يتطلب تسجيل دخول) ──
    [Authorize]
    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<object>>> GetStatus()
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Status == TenantStatus.Active);
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("لا يوجد اشتراك فعّال"));

        var daysRemaining = tenant.ExpiresAt.HasValue
            ? Math.Max(0, (tenant.ExpiresAt.Value - DateTime.UtcNow).Days)
            : 0;

        return Ok(ApiResponse<object>.Ok(new
        {
            schoolName = tenant.SchoolName,
            plan = tenant.Plan.ToString(),
            status = tenant.Status.ToString(),
            activatedAt = tenant.ActivatedAt,
            expiresAt = tenant.ExpiresAt,
            daysRemaining,
            isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0,
            isExpired = tenant.Status == TenantStatus.Expired || (tenant.ExpiresAt.HasValue && tenant.ExpiresAt.Value <= DateTime.UtcNow)
        }));
    }

    // ════════════════════════════════════════════════════
    // ★ Master Key Endpoints — أنت فقط كمطور تستخدمها
    // ════════════════════════════════════════════════════

    // ── إنشاء كود تفعيل جديد ──
    [HttpPost("generate")]
    public async Task<ActionResult<ApiResponse<object>>> Generate([FromBody] GenerateRequest req)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var plan = Enum.TryParse<LicensePlan>(req.Plan, true, out var p) ? p : LicensePlan.Trial;
        var duration = plan switch
        {
            LicensePlan.Trial => 14,
            LicensePlan.Semester => 180,
            LicensePlan.Yearly => 365,
            _ => 14
        };

        var code = GenerateUniqueCode();

        var tenant = new Tenant
        {
            Code = code,
            Plan = plan,
            DurationDays = duration,
            Status = TenantStatus.Unused,
            AdminPhone = req.Phone?.Trim() ?? "",
            Amount = req.Amount,
            Notes = req.Notes?.Trim() ?? "",
        };

        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            code,
            plan = plan.ToString(),
            durationDays = duration,
            tenantId = tenant.Id
        }, "تم إنشاء كود التفعيل"));
    }

    // ── تمديد اشتراك ──
    [HttpPost("{code}/extend")]
    public async Task<ActionResult<ApiResponse<object>>> Extend(string code, [FromBody] ExtendRequest req)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("كود غير موجود"));

        var baseDate = tenant.ExpiresAt > DateTime.UtcNow ? tenant.ExpiresAt.Value : DateTime.UtcNow;
        tenant.ExpiresAt = baseDate.AddDays(req.Days);
        tenant.Status = TenantStatus.Active;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            code = tenant.Code,
            newExpiresAt = tenant.ExpiresAt,
            daysAdded = req.Days
        }, $"تم تمديد الاشتراك {req.Days} يوم"));
    }

    // ── قائمة جميع التراخيص ──
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> ListAll()
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var list = await _db.Tenants
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.Code, t.SchoolName, t.AdminName, t.AdminPhone,
                plan = t.Plan.ToString(), status = t.Status.ToString(),
                t.DurationDays, t.Amount, t.ActivatedAt, t.ExpiresAt, t.CreatedAt,
                daysRemaining = t.ExpiresAt.HasValue ? Math.Max(0, (t.ExpiresAt.Value - DateTime.UtcNow).Days) : 0
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(list));
    }

    // ── إلغاء ترخيص ──
    [HttpPost("{code}/revoke")]
    public async Task<ActionResult<ApiResponse>> Revoke(string code)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse.Fail("كود غير موجود"));

        tenant.Status = TenantStatus.Revoked;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse.Ok("تم إلغاء الترخيص"));
    }

    // ── Helpers ──
    private bool IsMasterKeyValid()
    {
        var masterKey = _config["MasterKey"] ?? "CHANGE_THIS_MASTER_KEY_2026";
        var provided = Request.Headers["X-Master-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(provided) && provided == masterKey;
    }

    private string GenerateUniqueCode()
    {
        var year = DateTime.UtcNow.Year;
        var random = Guid.NewGuid().ToString("N")[..8].ToUpper();
        return $"SCH-{year}-{random[..4]}-{random[4..]}";
    }
}

// ── Request DTOs ──
public class ActivateRequest
{
    public string Code { get; set; } = "";
    public string AdminName { get; set; } = "";
    public string AdminPhone { get; set; } = "";
    public string Password { get; set; } = "";
    public string? SchoolName { get; set; }
}

public class GenerateRequest
{
    public string Plan { get; set; } = "Trial";
    public string? Phone { get; set; }
    public decimal Amount { get; set; } = 0;
    public string? Notes { get; set; }
}

public class ExtendRequest
{
    public int Days { get; set; } = 365;
}
