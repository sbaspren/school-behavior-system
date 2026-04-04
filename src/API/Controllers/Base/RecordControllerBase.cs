using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;
using SchoolBehaviorSystem.Infrastructure.Data;
using SchoolBehaviorSystem.Infrastructure.Services;

namespace SchoolBehaviorSystem.API.Controllers.Base;

/// <summary>
/// Base controller that extracts duplicate patterns shared across
/// ViolationsController, TardinessController, PermissionsController, and AbsenceController.
///
/// Provides:
///   - ApplyCommonFilters: generic filtering by Stage/Grade/ClassName/StudentId/DateRange/IsSent/Search
///   - UpdateSentStatusAsync: single record sent-status toggle
///   - UpdateSentBatchAsync: bulk sent-status update
///   - DeleteRecordAsync: single record deletion
///   - DeleteBulkAsync: bulk record deletion
///   - ResolveSenderPhoneAsync: WhatsApp sender phone resolution
///   - LogCommunicationAsync: communication log creation after WhatsApp send
///
/// NOTE: This class is intentionally created WITHOUT modifying existing controllers.
///       Controllers will be refactored to use it in a separate step.
/// </summary>
[ApiController]
public abstract class RecordControllerBase : ControllerBase
{
    protected readonly AppDbContext Db;
    protected readonly IWhatsAppServerService Wa;
    protected readonly IHijriDateService Hijri;
    protected readonly ISemesterService SemesterSvc;
    protected readonly IMemoryCache Cache;

    protected RecordControllerBase(AppDbContext db, IWhatsAppServerService wa, IHijriDateService hijri, ISemesterService semesterSvc, IMemoryCache cache)
    {
        Db = db;
        Wa = wa;
        Hijri = hijri;
        SemesterSvc = semesterSvc;
        Cache = cache;
    }

    /// <summary>
    /// يختم السجل بالفصل الدراسي والسنة الأكاديمية الحالية.
    /// يُستدعى عند إنشاء أي سجل جديد.
    /// </summary>
    protected async Task StampSemesterAsync(IStudentRecord record)
    {
        var (semester, year) = await SemesterSvc.GetCurrentAsync();
        record.Semester = semester;
        record.AcademicYear = year;
    }

    // ════════════════════════════════════════════════════════════════
    //  SCOPE ENFORCEMENT — عزل المراحل للوكلاء
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// يقرأ scope_type و scope_value من JWT claims.
    /// إذا كان المستخدم وكيل (Deputy) بمرحلة محددة، يُفرض stage تلقائياً.
    /// يرجع null إذا كان المستخدم Admin (بدون قيود).
    /// </summary>
    protected string? EnforceScopeStage(string? requestedStage)
    {
        var scopeType = User.FindFirst("scope_type")?.Value;
        var scopeValue = User.FindFirst("scope_value")?.Value;

        // Admin أو scope_type = "all" → بدون قيود
        if (string.IsNullOrEmpty(scopeType) || scopeType == "all")
            return requestedStage;

        // Deputy بمرحلة محددة → نفرض مرحلته بغض النظر عن الـ query parameter
        if (scopeType == "stage" && !string.IsNullOrEmpty(scopeValue))
            return scopeValue;

        return requestedStage;
    }

    /// <summary>
    /// يتحقق أن المستخدم مصرح له بالوصول للمرحلة المطلوبة.
    /// يرجع true إذا مسموح، false إذا ممنوع.
    /// </summary>
    protected bool IsStageAllowed(string? requestedStage)
    {
        var scopeType = User.FindFirst("scope_type")?.Value;
        var scopeValue = User.FindFirst("scope_value")?.Value;

        if (string.IsNullOrEmpty(scopeType) || scopeType == "all")
            return true;

        if (scopeType == "stage" && !string.IsNullOrEmpty(scopeValue))
        {
            if (string.IsNullOrEmpty(requestedStage)) return false;
            return string.Equals(requestedStage, scopeValue, StringComparison.OrdinalIgnoreCase);
        }

        return true;
    }

    // ════════════════════════════════════════════════════════════════
    //  FILTERING
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// Applies the common query filters shared by all record controllers:
    /// Stage, Grade, ClassName, StudentId, DateFrom, DateTo (Hijri string compare),
    /// IsSent, and free-text Search (StudentName / StudentNumber).
    ///
    /// ★ يفرض عزل المراحل تلقائياً — الوكيل لا يرى إلا مرحلته.
    ///
    /// The caller is responsible for adding any entity-specific filters
    /// (e.g. degree for Violations, tardinessType for Tardiness, etc.)
    /// AFTER calling this method.
    /// </summary>
    protected IQueryable<T> ApplyCommonFilters<T>(
        IQueryable<T> query,
        string? stage = null,
        string? grade = null,
        string? className = null,
        int? studentId = null,
        string? dateFrom = null,
        string? dateTo = null,
        bool? isSent = null,
        string? search = null,
        int? semester = null,
        string? academicYear = null) where T : class, IStudentRecord
    {
        // ★ عزل الفصل الدراسي — إذا لم يُحدد semester يُفلتر بالحالي
        if (semester.HasValue)
            query = query.Where(r => r.Semester == semester.Value);
        if (!string.IsNullOrEmpty(academicYear))
            query = query.Where(r => r.AcademicYear == academicYear);

        // ★ فرض عزل المراحل — الوكيل يرى مرحلته فقط
        var effectiveStage = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage) && Enum.TryParse<Stage>(effectiveStage, true, out var stageEnum))
            query = query.Where(r => r.Stage == stageEnum);

        if (!string.IsNullOrEmpty(grade))
            query = query.Where(r => r.Grade == grade);

        if (!string.IsNullOrEmpty(className))
            query = query.Where(r => r.Class == className);

        if (studentId.HasValue)
            query = query.Where(r => r.StudentId == studentId.Value);

        if (!string.IsNullOrEmpty(dateFrom))
            query = query.Where(r => string.Compare(r.HijriDate, dateFrom) >= 0);

        if (!string.IsNullOrEmpty(dateTo))
            query = query.Where(r => string.Compare(r.HijriDate, dateTo) <= 0);

        if (isSent.HasValue)
            query = query.Where(r => r.IsSent == isSent.Value);

        if (!string.IsNullOrEmpty(search))
        {
            var q = search.ToLower();
            query = query.Where(r =>
                r.StudentName.ToLower().Contains(q) ||
                r.StudentNumber.Contains(q));
        }

        return query;
    }

    /// <summary>
    /// Applies only the Stage filter (used by daily-stats, report, export endpoints).
    /// ★ يفرض عزل المراحل تلقائياً.
    /// </summary>
    protected IQueryable<T> ApplyStageFilter<T>(
        IQueryable<T> query,
        string? stage,
        int? semester = null,
        string? academicYear = null) where T : class, IStudentRecord
    {
        // ★ عزل الفصل الدراسي
        if (semester.HasValue)
            query = query.Where(r => r.Semester == semester.Value);
        if (!string.IsNullOrEmpty(academicYear))
            query = query.Where(r => r.AcademicYear == academicYear);

        var effectiveStage = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage) && Enum.TryParse<Stage>(effectiveStage, true, out var stageEnum))
            query = query.Where(r => r.Stage == stageEnum);
        return query;
    }

    // ════════════════════════════════════════════════════════════════
    //  SENT STATUS
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// Update IsSent for a single record. Used by PUT {id}/sent in all controllers.
    /// </summary>
    protected async Task<ActionResult<ApiResponse>> UpdateSentStatusAsync<T>(
        DbSet<T> dbSet,
        int id,
        bool isSent,
        string notFoundMessage = "السجل غير موجود") where T : class, IStudentRecord
    {
        var record = await dbSet.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail(notFoundMessage));

        record.IsSent = isSent;
        await Db.SaveChangesAsync();

        return Ok(ApiResponse.Ok("تم تحديث حالة الإرسال"));
    }

    /// <summary>
    /// Mark IsSent = true for a batch of records. Used by PUT sent-batch in all controllers.
    /// </summary>
    protected async Task<ActionResult<ApiResponse<object>>> UpdateSentBatchAsync<T>(
        DbSet<T> dbSet,
        List<int> ids,
        string emptyMessage = "لا توجد سجلات محددة") where T : class, IStudentRecord
    {
        if (ids == null || ids.Count == 0)
            return Ok(ApiResponse<object>.Fail(emptyMessage));

        var records = await dbSet
            .Where(r => ids.Contains(r.Id))
            .ToListAsync();

        foreach (var r in records)
            r.IsSent = true;

        await Db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { updatedCount = records.Count }));
    }

    // ════════════════════════════════════════════════════════════════
    //  DELETE
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// Delete a single record by id. Used by DELETE {id} in all controllers.
    /// Accepts an optional postDeleteAction for entity-specific side effects
    /// (e.g. updating cumulative absence counts).
    /// </summary>
    protected async Task<ActionResult<ApiResponse>> DeleteRecordAsync<T>(
        DbSet<T> dbSet,
        int id,
        string notFoundMessage = "السجل غير موجود",
        string successMessage = "تم حذف السجل بنجاح",
        Func<T, Task>? postDeleteAction = null) where T : class, IStudentRecord
    {
        var record = await dbSet.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail(notFoundMessage));

        if (postDeleteAction != null)
        {
            await using var tx = await Db.Database.BeginTransactionAsync();
            dbSet.Remove(record);
            await Db.SaveChangesAsync();
            await postDeleteAction(record);
            await tx.CommitAsync();
        }
        else
        {
            dbSet.Remove(record);
            await Db.SaveChangesAsync();
        }

        return Ok(ApiResponse.Ok(successMessage));
    }

    /// <summary>
    /// Delete multiple records by ids. Used by POST delete-bulk in all controllers.
    /// Accepts an optional postDeleteAction for entity-specific side effects.
    /// </summary>
    protected async Task<ActionResult<ApiResponse<object>>> DeleteBulkAsync<T>(
        DbSet<T> dbSet,
        List<int> ids,
        string emptyMessage = "لا توجد سجلات محددة",
        Func<List<T>, Task>? postDeleteAction = null) where T : class, IStudentRecord
    {
        if (ids == null || ids.Count == 0)
            return Ok(ApiResponse<object>.Fail(emptyMessage));

        var records = await dbSet
            .Where(r => ids.Contains(r.Id))
            .ToListAsync();

        if (postDeleteAction != null)
        {
            await using var tx = await Db.Database.BeginTransactionAsync();
            dbSet.RemoveRange(records);
            await Db.SaveChangesAsync();
            await postDeleteAction(records);
            await tx.CommitAsync();
        }
        else
        {
            dbSet.RemoveRange(records);
            await Db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { deletedCount = records.Count }));
    }

    // ════════════════════════════════════════════════════════════════
    //  WHATSAPP HELPERS
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// Validates WhatsApp settings and returns them, or null with an error response set.
    /// </summary>
    private const string WaSettingsCacheKey = "wa_settings";

    protected async Task<WhatsAppSettings?> GetWhatsAppSettingsOrNullAsync()
    {
        // ★ Cache لمدة 5 دقائق — يمنع استعلام DB مع كل رسالة في الإرسال الجماعي
        var settings = await Cache.GetOrCreateAsync(WaSettingsCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            var s = await Db.WhatsAppSettings.FirstOrDefaultAsync();
            if (s == null)
            {
                // ★ إنشاء تلقائي — يمنع ضياع الإعدادات
                s = new WhatsAppSettings
                {
                    ServerUrl = "http://194.163.133.252:3000",
                    ServiceStatus = "مفعل",
                    TenantId = 1
                };
                Db.WhatsAppSettings.Add(s);
                await Db.SaveChangesAsync();
            }
            return s;
        });

        if (settings == null || string.IsNullOrEmpty(settings.ServerUrl))
            return null;
        return settings;
    }

    /// <summary>
    /// Resolves the sender phone number for a WhatsApp message.
    /// Tries the provided senderPhone first; falls back to primary session for the stage,
    /// then to any primary session.
    /// Returns empty string if no sender is available.
    /// </summary>
    protected async Task<string> ResolveSenderPhoneAsync(string? senderPhone, string stageName)
    {
        if (!string.IsNullOrEmpty(senderPhone))
            return senderPhone;

        var session = await Db.WhatsAppSessions
            .Where(s => s.IsPrimary && s.Stage == stageName)
            .FirstOrDefaultAsync();

        session ??= await Db.WhatsAppSessions
            .Where(s => s.IsPrimary)
            .FirstOrDefaultAsync();

        return session?.PhoneNumber ?? "";
    }

    /// <summary>
    /// Creates a CommunicationLog entry after a successful WhatsApp send.
    /// Does NOT call SaveChangesAsync -- the caller should batch saves.
    /// </summary>
    protected void LogCommunication(
        int studentId,
        string studentNumber,
        string studentName,
        string grade,
        string className,
        Stage stage,
        string mobile,
        string messageType,
        string messageTitle,
        string messageBody,
        string sentBy,
        int semester = 0,
        string academicYear = "")
    {
        Db.CommunicationLogs.Add(new CommunicationLog
        {
            StudentId = studentId,
            StudentNumber = studentNumber,
            StudentName = studentName,
            Grade = grade,
            Class = className,
            Stage = stage,
            Mobile = mobile,
            MessageType = messageType,
            MessageTitle = messageTitle,
            MessageBody = messageBody,
            SendStatus = "تم",
            HijriDate = Hijri.GetHijriDate(),
            MiladiDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            SentBy = sentBy,
            Semester = semester > 0 ? semester : 1,
            AcademicYear = academicYear
        });
    }

    /// <summary>
    /// Common WhatsApp send flow for a single record that has a Mobile field.
    /// Handles: settings check, sender resolution, send, mark IsSent, log.
    ///
    /// Parameters:
    ///   record - the entity (must implement IStudentRecord)
    ///   mobile - the recipient phone number
    ///   message - the message text to send
    ///   senderPhone - optional explicit sender; resolved automatically if null
    ///   messageType - type label for communication log (e.g. "غياب", "تأخر")
    ///   messageTitle - title for communication log
    ///   sentBy - user who triggered the send
    ///
    /// Returns an ActionResult with { success = true/false } or an error response.
    /// </summary>
    protected async Task<ActionResult<ApiResponse<object>>> SendWhatsAppSingleAsync<T>(
        T record,
        string mobile,
        string message,
        string? senderPhone,
        string messageType,
        string messageTitle,
        string sentBy) where T : class, IStudentRecord
    {
        if (string.IsNullOrEmpty(mobile))
            return Ok(ApiResponse<object>.Fail("لا يوجد رقم جوال"));

        var settings = await GetWhatsAppSettingsOrNullAsync();
        if (settings == null)
            return Ok(ApiResponse<object>.Fail("إعدادات الواتساب غير مكتملة"));

        var resolvedSender = await ResolveSenderPhoneAsync(senderPhone, record.Stage.ToString());
        if (string.IsNullOrEmpty(resolvedSender))
            return Ok(ApiResponse<object>.Fail("لا يوجد رقم مرسل متاح"));

        var sent = await Wa.SendMessageAsync(settings.ServerUrl, resolvedSender, mobile, message);

        if (sent)
        {
            record.IsSent = true;
            LogCommunication(
                record.StudentId, record.StudentNumber, record.StudentName,
                record.Grade, record.Class, record.Stage,
                mobile, messageType, messageTitle, message, sentBy);
            await Db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { success = sent }));
    }

    // ★ حد أقصى للإرسال الجماعي — يحمي السيرفر من الحمل الزائد
    private const int MaxBulkSendCount = 500;

    /// <summary>
    /// Common WhatsApp bulk send flow.
    /// ★ مطابق للنظام الأصلي: يدعم 4 سرعات (بطيء/متوازن/سريع/مخصص)
    ///   مع delay عشوائي بين الحد الأدنى والأقصى لكل سرعة
    ///   لحماية الرقم من الحظر من واتساب.
    /// </summary>
    protected async Task<(int sentCount, int failedCount, int total)> SendWhatsAppBulkCoreAsync<T>(
        List<T> records,
        Func<T, string> getMobile,
        Func<T, Task<string>> buildMessage,
        string? senderPhone,
        string messageType,
        Func<T, string> getMessageTitle,
        string sentBy,
        int delayMs = 10_000,
        string? speed = null,
        int? customDelaySeconds = null) where T : class, IStudentRecord
    {
        int sentCount = 0, failedCount = 0;

        // ★ حد أقصى للإرسال — يمنع مدرسة واحدة من خنق السيرفر
        if (records.Count > MaxBulkSendCount)
            records = records.Take(MaxBulkSendCount).ToList();

        var settings = await GetWhatsAppSettingsOrNullAsync();
        if (settings == null)
            return (0, records.Count, records.Count);

        // ★ حساب نطاق التأخير حسب السرعة المختارة — مطابق للنظام الأصلي
        var (minDelay, maxDelay) = ResolveSpeedRange(speed, customDelaySeconds, delayMs);
        var rng = new Random();

        // ★ عدد الفشل المتتالي — Circuit Breaker بسيط
        int consecutiveFailures = 0;
        const int maxConsecutiveFailures = 10;

        foreach (var record in records)
        {
            // ★ Circuit Breaker: لو فشلت 10 رسائل متتالية، السيرفر غالباً واقع
            if (consecutiveFailures >= maxConsecutiveFailures)
            {
                failedCount += records.Count - sentCount - failedCount;
                break;
            }

            var mobile = getMobile(record);
            if (string.IsNullOrEmpty(mobile)) { failedCount++; continue; }

            var resolvedSender = await ResolveSenderPhoneAsync(senderPhone, record.Stage.ToString());
            if (string.IsNullOrEmpty(resolvedSender)) { failedCount++; continue; }

            var message = await buildMessage(record);
            if (string.IsNullOrEmpty(message)) { failedCount++; continue; }
            var sent = await Wa.SendMessageAsync(settings.ServerUrl, resolvedSender, mobile, message);

            if (sent)
            {
                record.IsSent = true;
                sentCount++;
                consecutiveFailures = 0; // ★ إعادة العداد عند النجاح
                LogCommunication(
                    record.StudentId, record.StudentNumber, record.StudentName,
                    record.Grade, record.Class, record.Stage,
                    mobile, messageType, getMessageTitle(record), message, sentBy);
            }
            else
            {
                failedCount++;
                consecutiveFailures++;
            }

            // ★ تأخير عشوائي ضمن النطاق — يحاكي السلوك البشري ويحمي من الحظر
            var delay = rng.Next(minDelay, maxDelay + 1);
            await Task.Delay(delay);
        }

        await Db.SaveChangesAsync();

        return (sentCount, failedCount, records.Count);
    }

    /// <summary>
    /// يحوّل اسم السرعة إلى نطاق تأخير (بالمللي ثانية).
    /// ★ مطابق لخيارات النظام الأصلي: بطيء / متوازن / سريع / مخصص
    /// </summary>
    private static (int minMs, int maxMs) ResolveSpeedRange(string? speed, int? customDelaySeconds, int fallbackMs)
    {
        return (speed?.ToLower()) switch
        {
            "slow" or "بطيء"      => (15_000, 45_000),  // 15-45 ثانية — أكثر أماناً
            "balanced" or "متوازن" => (8_000, 20_000),   // 8-20 ثانية — الافتراضي
            "fast" or "سريع"      => (5_000, 12_000),   // 5-12 ثانية — أسرع (خطر أعلى)
            "custom" or "مخصص"    => customDelaySeconds > 0
                                        ? (customDelaySeconds.Value * 1000, customDelaySeconds.Value * 1000)
                                        : (8_000, 20_000),
            _                      => (fallbackMs, fallbackMs), // fallback للتوافق مع الكود القديم
        };
    }
}

// ════════════════════════════════════════════════════════════════════
//  Shared Request DTOs
//  These are the common DTOs duplicated across all controllers.
//  The existing per-controller DTOs (UpdateSentRequest, BulkIdsRequest,
//  BulkSendWhatsAppRequest) remain for now; controllers will be migrated
//  to use these in a separate step.
// ════════════════════════════════════════════════════════════════════

/// <summary>
/// Request body for updating sent status of a single record.
/// Replaces per-controller UpdateSentRequest.
/// </summary>
public class CommonUpdateSentRequest
{
    public bool IsSent { get; set; }
}

/// <summary>
/// Request body for bulk operations that require a list of Ids.
/// Replaces per-controller BulkIdsRequest.
/// </summary>
public class CommonBulkIdsRequest
{
    public List<int> Ids { get; set; } = new();
}

public class BulkUpdateTypeRequest
{
    public List<int> Ids { get; set; } = new();
    public string AbsenceType { get; set; } = "FullDay";
}

/// <summary>
/// Request body for bulk WhatsApp send.
/// Replaces per-controller BulkSendWhatsAppRequest.
/// </summary>
public class CommonBulkSendWhatsAppRequest
{
    public List<int> Ids { get; set; } = new();
    public string? SenderPhone { get; set; }
    public string? SentBy { get; set; }
    /// <summary>
    /// سرعة الإرسال: "slow" (15-45s) | "balanced" (8-20s) | "fast" (5-12s) | "custom"
    /// مطابق للنظام الأصلي — يحمي الرقم من الحظر
    /// </summary>
    public string? Speed { get; set; }
    /// <summary>تأخير مخصص بالثواني (فقط عند Speed = "custom")</summary>
    public int? CustomDelaySeconds { get; set; }
}

/// <summary>
/// Request body for single WhatsApp send (common fields).
/// Each controller may extend this with domain-specific fields.
/// </summary>
public class CommonSendWhatsAppRequest
{
    public string? SenderPhone { get; set; }
    public string? Message { get; set; }
    public string? SentBy { get; set; }
}
