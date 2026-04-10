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
        // ★ IgnoreQueryFilters — بدون JWT، TenantId defaults to 1
        // نتحقق من جميع المستخدمين والاشتراكات بدون فلتر Tenant
        var hasUsers = await _db.Users.IgnoreQueryFilters().AnyAsync();
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

        // ★ تعيين OverrideTenantId لضمان أن SaveChangesAsync يستخدم tenant.Id الصحيح
        // بدون JWT، الـ TenantId الافتراضي = 1 مما يكتب البيانات في tenant خاطئ
        HttpContext.Items["OverrideTenantId"] = tenant.Id;

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
        if (!await _db.SchoolSettings.IgnoreQueryFilters().AnyAsync(s => s.TenantId == tenant.Id))
        {
            _db.SchoolSettings.Add(new SchoolSettings
            {
                SchoolName = req.SchoolName?.Trim() ?? "مدرسة جديدة",
                EduAdmin = "",
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
            LicensePlan.TwoYears => 730,
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

        // ★ نجلب البيانات أولاً ثم نحسب daysRemaining في الذاكرة (Math.Max لا يُترجم في MySQL)
        var tenants = await _db.Tenants
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var list = tenants.Select(t => new
        {
            t.Id, t.Code, t.SchoolName, t.AdminName, t.AdminPhone,
            plan = t.Plan.ToString(), status = t.Status.ToString(),
            t.DurationDays, t.Amount, t.IsPaid, t.ActivatedAt, t.ExpiresAt, t.CreatedAt,
            daysRemaining = t.ExpiresAt.HasValue ? Math.Max(0, (t.ExpiresAt.Value - DateTime.UtcNow).Days) : 0
        }).ToList();

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

    // ── التحقق من المفتاح الرئيسي (للوحة التحكم) ──
    [HttpPost("admin/auth")]
    public ActionResult<ApiResponse<object>> AdminAuth()
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        return Ok(ApiResponse<object>.Ok(new { authenticated = true }, "تم التحقق بنجاح"));
    }

    // ── إحصائيات الاشتراكات ──
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetStats()
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenants = await _db.Tenants.ToListAsync();
        var now = DateTime.UtcNow;

        var total = tenants.Count;
        var active = tenants.Count(t => t.Status == TenantStatus.Active && t.ExpiresAt > now);
        var expired = tenants.Count(t => t.Status == TenantStatus.Expired || (t.Status == TenantStatus.Active && t.ExpiresAt <= now));
        var trial = tenants.Count(t => t.Plan == LicensePlan.Trial && t.Status == TenantStatus.Active);
        var unused = tenants.Count(t => t.Status == TenantStatus.Unused);
        var revoked = tenants.Count(t => t.Status == TenantStatus.Revoked);
        var expiringSoon = tenants.Count(t => t.Status == TenantStatus.Active && t.ExpiresAt.HasValue
            && t.ExpiresAt.Value > now && (t.ExpiresAt.Value - now).Days <= 7);

        return Ok(ApiResponse<object>.Ok(new
        {
            total, active, expired, trial, unused, revoked, expiringSoon
        }));
    }

    // ── إعادة تفعيل ترخيص ملغي ──
    [HttpPost("{code}/reactivate")]
    public async Task<ActionResult<ApiResponse<object>>> Reactivate(string code, [FromBody] ExtendRequest req)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("كود غير موجود"));

        tenant.ExpiresAt = DateTime.UtcNow.AddDays(req.Days);
        tenant.Status = TenantStatus.Active;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            code = tenant.Code,
            newExpiresAt = tenant.ExpiresAt,
            daysAdded = req.Days
        }, "تم إعادة تفعيل الاشتراك"));
    }

    // ── الدخول كمدير مدرسة (Impersonate) ──
    [HttpPost("{code}/impersonate")]
    public async Task<ActionResult<ApiResponse<object>>> Impersonate(string code)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("كود غير موجود"));

        // البحث عن مدير المدرسة
        var admin = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Role == Domain.Enums.UserRole.Admin && u.IsActive);
        if (admin == null)
            return Ok(ApiResponse<object>.Fail("لا يوجد مدير لهذه المدرسة"));

        var token = _authService.GenerateJwtToken(admin);

        return Ok(ApiResponse<object>.Ok(new
        {
            token,
            user = new
            {
                id = admin.Id,
                name = admin.Name,
                role = admin.Role.ToString(),
                mobile = admin.Mobile,
                scopeType = admin.ScopeType,
                scopeValue = admin.ScopeValue
            },
            tenant = new
            {
                schoolName = tenant.SchoolName,
                plan = tenant.Plan.ToString(),
                code = tenant.Code
            }
        }, $"تم الدخول كمدير: {tenant.SchoolName}"));
    }

    // ── تحديث بيانات الدفع ──
    [HttpPut("{code}/payment")]
    public async Task<ActionResult<ApiResponse<object>>> UpdatePayment(string code, [FromBody] PaymentRequest req)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse<object>.Fail("كود غير موجود"));

        tenant.IsPaid = req.IsPaid;
        tenant.Amount = req.Amount;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            code = tenant.Code,
            isPaid = tenant.IsPaid,
            amount = tenant.Amount
        }, "تم تحديث بيانات الدفع"));
    }

    // ── حذف مدرسة نهائياً (بجميع بياناتها) ──
    [HttpDelete("{code}")]
    public async Task<ActionResult<ApiResponse>> DeleteSchool(string code)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == code);
        if (tenant == null)
            return Ok(ApiResponse.Fail("كود غير موجود"));

        var tid = tenant.Id;

        // ★ حذف جميع البيانات المرتبطة بالمدرسة — IgnoreQueryFilters لتجاوز فلتر Tenant
        // الترتيب مهم: الجداول التابعة أولاً ثم الجداول الرئيسية
        _db.PositiveBehaviors.RemoveRange(await _db.PositiveBehaviors.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.EducationalNotes.RemoveRange(await _db.EducationalNotes.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.CumulativeAbsences.RemoveRange(await _db.CumulativeAbsences.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.DailyAbsences.RemoveRange(await _db.DailyAbsences.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.TardinessRecords.RemoveRange(await _db.TardinessRecords.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.PermissionRecords.RemoveRange(await _db.PermissionRecords.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.Violations.RemoveRange(await _db.Violations.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.CommunicationLogs.RemoveRange(await _db.CommunicationLogs.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.ParentExcuses.RemoveRange(await _db.ParentExcuses.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.ParentAccessCodes.RemoveRange(await _db.ParentAccessCodes.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.AcademicGrades.RemoveRange(await _db.AcademicGrades.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.AcademicSummaries.RemoveRange(await _db.AcademicSummaries.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.LinkedPersons.RemoveRange(await _db.LinkedPersons.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.MessageTemplates.RemoveRange(await _db.MessageTemplates.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.AuditLogs.RemoveRange(await _db.AuditLogs.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());

        // CommitteeMembers + CommitteeMeetings تُحذف تلقائياً بـ Cascade من Committee
        _db.CommitteeMembers.RemoveRange(await _db.CommitteeMembers.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.CommitteeMeetings.RemoveRange(await _db.CommitteeMeetings.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.Committees.RemoveRange(await _db.Committees.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());

        _db.Students.RemoveRange(await _db.Students.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.Teachers.RemoveRange(await _db.Teachers.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.Users.RemoveRange(await _db.Users.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.Subjects.RemoveRange(await _db.Subjects.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        // ViolationTypeDefs و NoteTypeDefs — بدون TenantId (مشتركة عامة)
        _db.WhatsAppSessions.RemoveRange(await _db.WhatsAppSessions.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.WhatsAppSettings.RemoveRange(await _db.WhatsAppSettings.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.SchoolSettings.RemoveRange(await _db.SchoolSettings.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());
        _db.StageConfigs.RemoveRange(await _db.StageConfigs.IgnoreQueryFilters().Where(x => x.TenantId == tid).ToListAsync());

        // أخيراً: حذف الـ Tenant نفسه
        _db.Tenants.Remove(tenant);

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok($"تم حذف المدرسة ({tenant.SchoolName ?? tenant.Code}) وجميع بياناتها نهائياً"));
    }

    // ════════════════════════════════════════════════════
    // ★ التقويم الدراسي — 5 سنوات مقدماً
    // ════════════════════════════════════════════════════

    // ── قائمة التقاويم ──
    [HttpGet("calendar")]
    public async Task<ActionResult<ApiResponse<object>>> ListCalendars()
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var calendars = await _db.AcademicCalendars
            .OrderBy(c => c.Semester1Start)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(calendars));
    }

    // ── التقويم الحالي (عام — بدون مفتاح) ──
    [HttpGet("calendar/current")]
    public async Task<ActionResult<ApiResponse<object>>> GetCurrentCalendar()
    {
        var now = DateTime.UtcNow;
        var calendar = await _db.AcademicCalendars
            .Where(c => c.Semester1Start <= now && c.Semester2End.AddDays(c.BufferDays) >= now)
            .FirstOrDefaultAsync()
            ?? await _db.AcademicCalendars.Where(c => c.IsCurrent).FirstOrDefaultAsync();

        if (calendar == null)
            return Ok(ApiResponse<object>.Ok(new { hasCurrent = false }));

        // حساب الفصل الحالي
        string currentSemester;
        int daysRemaining;
        DateTime semesterEnd;

        if (now <= calendar.Semester1End.AddDays(calendar.BufferDays))
        {
            currentSemester = "S1";
            semesterEnd = calendar.Semester1End;
            daysRemaining = Math.Max(0, (calendar.Semester1End - now).Days);
        }
        else
        {
            currentSemester = "S2";
            semesterEnd = calendar.Semester2End;
            daysRemaining = Math.Max(0, (calendar.Semester2End - now).Days);
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            hasCurrent = true,
            calendar.AcademicYear,
            calendar.Label,
            currentSemester,
            semesterLabel = currentSemester == "S1" ? "الفصل الأول" : "الفصل الثاني",
            daysRemaining,
            semesterEnd,
            isInBuffer = now > semesterEnd && now <= semesterEnd.AddDays(calendar.BufferDays),
            bufferDays = calendar.BufferDays,
            semester1Start = calendar.Semester1Start,
            semester1End = calendar.Semester1End,
            semester2Start = calendar.Semester2Start,
            semester2End = calendar.Semester2End,
        }));
    }

    // ── إضافة / تعديل تقويم ──
    [HttpPost("calendar")]
    public async Task<ActionResult<ApiResponse<object>>> SaveCalendar([FromBody] CalendarRequest req)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var existing = await _db.AcademicCalendars
            .FirstOrDefaultAsync(c => c.Id == req.Id);

        if (existing != null)
        {
            // تعديل
            existing.AcademicYear = req.AcademicYear;
            existing.Label = req.Label;
            existing.Semester1Start = req.Semester1Start;
            existing.Semester1End = req.Semester1End;
            existing.Semester2Start = req.Semester2Start;
            existing.Semester2End = req.Semester2End;
            existing.BufferDays = req.BufferDays;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // إضافة جديد
            var calendar = new AcademicCalendar
            {
                AcademicYear = req.AcademicYear,
                Label = req.Label,
                Semester1Start = req.Semester1Start,
                Semester1End = req.Semester1End,
                Semester2Start = req.Semester2Start,
                Semester2End = req.Semester2End,
                BufferDays = req.BufferDays,
            };
            _db.AcademicCalendars.Add(calendar);
        }

        // تحديد العام الحالي تلقائياً
        var now = DateTime.UtcNow;
        var allCalendars = await _db.AcademicCalendars.ToListAsync();
        foreach (var c in allCalendars)
        {
            c.IsCurrent = c.Semester1Start <= now && c.Semester2End.AddDays(c.BufferDays) >= now;
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(true, "تم حفظ التقويم"));
    }

    // ── حذف تقويم ──
    [HttpDelete("calendar/{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteCalendar(int id)
    {
        if (!IsMasterKeyValid())
            return Unauthorized(ApiResponse.Fail("مفتاح غير صحيح"));

        var calendar = await _db.AcademicCalendars.FindAsync(id);
        if (calendar == null)
            return Ok(ApiResponse.Fail("غير موجود"));

        _db.AcademicCalendars.Remove(calendar);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم الحذف"));
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

public class PaymentRequest
{
    public bool IsPaid { get; set; }
    public decimal Amount { get; set; }
}

public class CalendarRequest
{
    public int Id { get; set; }                       // 0 = جديد
    public string AcademicYear { get; set; } = "";    // "1447-1448"
    public string Label { get; set; } = "";            // "2025/2026"
    public DateTime Semester1Start { get; set; }
    public DateTime Semester1End { get; set; }
    public DateTime Semester2Start { get; set; }
    public DateTime Semester2End { get; set; }
    public int BufferDays { get; set; } = 4;
}
