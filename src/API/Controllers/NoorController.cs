using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.API.Services;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NoorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHijriDateService _hijri;
    private readonly NotificationService _notifications;

    public NoorController(AppDbContext db, IHijriDateService hijri, NotificationService notifications)
    {
        _db = db;
        _hijri = hijri;
        _notifications = notifications;
    }

    // ====================================================================
    // السجلات المعلّقة للتوثيق في نور
    // ====================================================================
    [HttpGet("pending-records")]
    public async Task<ActionResult<ApiResponse<object>>> GetPendingRecords(
        [FromQuery] string? stage = null,
        [FromQuery] string type = "all",
        [FromQuery] string filterMode = "today")
    {
        Stage? stageEnum = null;
        if (!string.IsNullOrEmpty(stage) && Enum.TryParse<Stage>(stage, true, out var parsed))
            stageEnum = parsed;

        var today = DateTime.UtcNow.Date;
        var records = new List<object>();
        var stats = new NoorPendingStats();

        // ═══ 1. المخالفات السلوكية ═══
        if (type is "all" or "violations")
        {
            var q = _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"));
            if (stageEnum != null) q = q.Where(v => v.Stage == stageEnum);
            if (filterMode == "today") q = q.Where(v => v.RecordedAt >= today);

            var items = await q.Select(v => new
            {
                v.Id,
                v.StudentName, v.Grade, v.Class,
                stage = v.Stage.ToString(),
                violationCode = v.ViolationCode,
                description = v.Description,
                degree = (int)v.Degree,
                degreeName = v.Degree.ToString(),
                date = v.MiladiDate != "" ? v.MiladiDate : v.RecordedAt.ToString("yyyy-MM-dd"),
                v.NoorStatus
            }).OrderBy(v => v.Class).ThenBy(v => v.StudentName).ToListAsync();

            foreach (var item in items)
            {
                string? noorValue = null, noorText = null;
                var stageStr = item.stage ?? "";

                // 1. ربط عبر خريطة أوصاف التطبيق → أكواد نور (الأكثر دقة)
                if (!string.IsNullOrEmpty(item.description))
                {
                    var noorCode = NoorMappings.GetNoorCodeForAppDescription(item.description);
                    if (noorCode != null)
                    {
                        var mapping = NoorMappings.GetViolationByStage(noorCode, stageStr);
                        noorValue = mapping.noorValue;
                        noorText = mapping.noorText;
                    }
                }

                // 2. ربط عبر رقم المخالفة مباشرة (للسجلات التي تستخدم أكواد نور)
                if (noorValue == null && !string.IsNullOrEmpty(item.violationCode))
                {
                    var mapping = NoorMappings.GetViolationByStage(item.violationCode, stageStr);
                    noorValue = mapping.noorValue;
                    noorText = mapping.noorText;
                }

                // 3. بحث بالنص كخطة بديلة أخيرة
                if (noorValue == null && !string.IsNullOrEmpty(item.description))
                {
                    var textMapping = NoorMappings.FindNoorViolationByText(item.description, stageStr);
                    if (textMapping != null)
                    {
                        noorValue = textMapping.Value.noorValue;
                        noorText = textMapping.Value.noorText;
                    }
                }

                records.Add(new
                {
                    item.Id, _type = "violation",
                    item.StudentName, item.Grade, item.Class, item.stage,
                    item.violationCode, item.description, item.degree, item.degreeName,
                    item.date, item.NoorStatus,
                    _noorValue = noorValue,
                    _noorText = noorText,
                    _noorMode = new { mowadaba = "1", deductType = "1" }
                });
            }
            stats.violations = items.Count;

            // ═══ التأخر الصباحي — يُعرض ضمن المخالفات مع _type = "tardiness" للتوجيه الصحيح ═══
            {
                var tQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق" || t.NoorStatus == "failed");
                if (stageEnum != null) tQ = tQ.Where(t => t.Stage == stageEnum);
                if (filterMode == "today") tQ = tQ.Where(t => t.RecordedAt >= today);

                var tardItems = await tQ.Select(t => new
                {
                    t.Id,
                    t.StudentName, t.Grade, t.Class,
                    stage = t.Stage.ToString(),
                    tardinessType = t.TardinessType.ToString(),
                    date = t.RecordedAt.ToString("yyyy-MM-dd"),
                    t.NoorStatus
                }).OrderBy(t => t.Class).ThenBy(t => t.StudentName).ToListAsync();

                foreach (var item in tardItems)
                {
                    var stageStr = item.stage ?? "";
                    var mapping = NoorMappings.GetViolationByStage("101", stageStr);
                    records.Add(new
                    {
                        item.Id, _type = "tardiness",
                        item.StudentName, item.Grade, item.Class, item.stage,
                        item.tardinessType, item.date, item.NoorStatus,
                        _noorValue = mapping.noorValue,
                        _noorText = mapping.noorText,
                        _noorMode = new { mowadaba = "1", deductType = "1" }
                    });
                }
                stats.violations += tardItems.Count;
            }
        }

        // ═══ 2. السلوك الإيجابي (تعويضية + متمايز) ═══
        if (type is "all" or "compensation" or "excellent" or "positive")
        {
            var q = _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق" || p.NoorStatus == "failed");
            if (stageEnum != null) q = q.Where(p => p.Stage == stageEnum);
            if (filterMode == "today") q = q.Where(p => p.RecordedAt >= today);

            var allPositive = await q.Select(p => new
            {
                p.Id, p.StudentName, p.Grade, p.Class,
                stage = p.Stage.ToString(),
                behaviorType = p.BehaviorType,
                degree = p.Degree,
                details = p.Details,
                recordedBy = p.RecordedBy,
                date = p.RecordedAt.ToString("yyyy-MM-dd"),
                p.NoorStatus
            }).OrderBy(p => p.Class).ThenBy(p => p.StudentName).ToListAsync();

            foreach (var p in allPositive)
            {
                var isCompensation = p.behaviorType.Contains("تعويض") || p.details.Contains("تعويض")
                                     || p.degree.Contains("تعويض");
                var recType = isCompensation ? "compensation" : "excellent";

                if (type == "all" || type == "positive" || type == recType)
                {
                    // ربط بنور
                    string? noorValue = null, noorText = null;
                    var mapToUse = isCompensation
                        ? NoorMappings.GetCompensationMap()
                        : NoorMappings.GetExcellentMap();
                    var noorMapping = NoorMappings.FindNoorMapping(mapToUse, p.behaviorType);
                    if (noorMapping.NoorValue != null)
                    {
                        noorValue = noorMapping.NoorValue;
                        noorText = noorMapping.NoorText;
                    }

                    records.Add(new
                    {
                        p.Id, _type = recType,
                        p.StudentName, p.Grade, p.Class, p.stage,
                        p.behaviorType, p.details, p.recordedBy,
                        p.date, p.NoorStatus,
                        _noorValue = noorValue,
                        _noorText = noorText,
                        _noorMode = new { mowadaba = "1", deductType = "2" }
                    });

                    if (isCompensation) stats.compensation++;
                    else stats.excellent++;
                }
            }
        }

        // ═══ 4. الغياب اليومي ═══
        if (type is "all" or "absence")
        {
            var q = _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق" || a.NoorStatus == "failed");
            if (stageEnum != null) q = q.Where(a => a.Stage == stageEnum);

            // فلتر اليوم: الغياب يُفلتر بالتاريخ الهجري (كما في الأصل) وليس بالميلادي
            if (filterMode == "today")
            {
                var todayHijri = _hijri.GetHijriDate();
                if (!string.IsNullOrEmpty(todayHijri))
                {
                    var normalizedToday = NoorMappings.NormalizeHijriDate(todayHijri);
                    // لا يمكن تنفيذ NormalizeHijriDate في SQL — نجلب الكل ونُفلتر في الذاكرة
                    var allAbsence = await q.ToListAsync();
                    var filtered = allAbsence.Where(a =>
                        NoorMappings.NormalizeHijriDate(a.HijriDate) == normalizedToday).ToList();

                    foreach (var a in filtered.OrderBy(a => a.Class).ThenBy(a => a.StudentName))
                    {
                        var (noorValue, noorText) = MapAbsenceToNoor(a.ExcuseType);
                        records.Add(new
                        {
                            a.Id, _type = "absence",
                            a.StudentName, a.Grade, a.Class,
                            stage = a.Stage.ToString(),
                            absenceType = a.AbsenceType.ToString(),
                            excuseType = a.ExcuseType.ToString(),
                            hijriDate = a.HijriDate,
                            date = a.RecordedAt.ToString("yyyy-MM-dd"),
                            a.NoorStatus,
                            _noorValue = noorValue,
                            _noorText = noorText,
                            _noorMode = new { mowadaba = "2", deductType = (string?)null }
                        });
                    }
                    stats.absence = filtered.Count;
                }
                else
                {
                    // fallback to RecordedAt if hijri date unavailable
                    q = q.Where(a => a.RecordedAt >= today);
                    await AddAbsenceRecords(q, records, stats);
                }
            }
            else
            {
                await AddAbsenceRecords(q, records, stats);
            }
        }

        return Ok(ApiResponse<object>.Ok(new { records, stats, total = records.Count }));
    }

    /// <summary>إضافة سجلات الغياب (مع ربط نور) — يستخدم عندما لا يكون الفلتر بالهجري</summary>
    private async Task AddAbsenceRecords(IQueryable<Domain.Entities.DailyAbsence> q,
        List<object> records, NoorPendingStats stats)
    {
        var items = await q.Select(a => new
        {
            a.Id, a.StudentName, a.Grade, a.Class,
            stage = a.Stage.ToString(),
            absenceType = a.AbsenceType.ToString(),
            excuseType = a.ExcuseType,
            hijriDate = a.HijriDate,
            date = a.RecordedAt.ToString("yyyy-MM-dd"),
            a.NoorStatus
        }).OrderBy(a => a.Class).ThenBy(a => a.StudentName).ToListAsync();

        foreach (var a in items)
        {
            var (noorValue, noorText) = MapAbsenceToNoor(a.excuseType);
            records.Add(new
            {
                a.Id, _type = "absence",
                a.StudentName, a.Grade, a.Class, a.stage,
                a.absenceType, excuseType = a.excuseType.ToString(),
                a.hijriDate, a.date, a.NoorStatus,
                _noorValue = noorValue,
                _noorText = noorText,
                _noorMode = new { mowadaba = "2", deductType = (string?)null }
            });
        }
        stats.absence = items.Count;
    }

    /// <summary>تحويل نوع العذر إلى قيمة نور — 4 أنواع مطابق للأصلي</summary>
    private static (string noorValue, string noorText) MapAbsenceToNoor(ExcuseType excuseType)
    {
        return excuseType switch
        {
            ExcuseType.Excused           => ("141,",     "الغياب بعذر"),
            ExcuseType.PlatformExcused   => ("800667,",  "الغياب بعذر مقبول عبر منصة مدرستي"),
            ExcuseType.PlatformUnexcused => ("1201153,", "الغياب بدون عذر مقبول عبر منصة مدرستي"),
            _                            => ("48,",      "الغياب بدون عذر مقبول")
        };
    }


    // ====================================================================
    // إحصائيات نور
    // ====================================================================
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetStats(
        [FromQuery] string? stage = null,
        [FromQuery] string? filterMode = null)
    {
        Stage? stageEnum = null;
        if (!string.IsNullOrEmpty(stage) && Enum.TryParse<Stage>(stage, true, out var parsed))
            stageEnum = parsed;

        var today = DateTime.UtcNow.Date;

        // موثق اليوم
        var documentedToday = await CountDocumentedToday(stageEnum, today);

        // إذا طُلب وضع محدد فقط
        if (filterMode == "today" || filterMode == "all")
        {
            var pending = await CountPendingByType(stageEnum, filterMode == "today" ? today : (DateTime?)null);
            return Ok(ApiResponse<object>.Ok(new
            {
                pending = new
                {
                    pending.violations, pending.compensation,
                    pending.excellent, pending.absence,
                    total = pending.violations + pending.compensation + pending.excellent + pending.absence,
                    documentedToday
                }
            }));
        }

        // الافتراضي: إرجاع إحصائيات اليوم + كل غير الموثق معاً
        var todayPending = await CountPendingByType(stageEnum, today);
        var allPending = await CountPendingByType(stageEnum, null);

        return Ok(ApiResponse<object>.Ok(new
        {
            pending = new
            {
                todayPending.violations, todayPending.compensation,
                todayPending.excellent, todayPending.absence,
                total = todayPending.violations + todayPending.compensation + todayPending.excellent + todayPending.absence,
                documentedToday
            },
            allPending = new
            {
                allPending.violations, allPending.compensation,
                allPending.excellent, allPending.absence,
                total = allPending.violations + allPending.compensation + allPending.excellent + allPending.absence
            }
        }));
    }

    /// <summary>عد السجلات المعلقة حسب النوع</summary>
    private async Task<NoorPendingStats> CountPendingByType(Stage? stageEnum, DateTime? todayCutoff)
    {
        var stats = new NoorPendingStats();

        var vQ = _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"));
        var tQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق" || t.NoorStatus == "failed");
        var pQ = _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق" || p.NoorStatus == "failed");
        var aQ = _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق" || a.NoorStatus == "failed");

        if (stageEnum != null)
        {
            vQ = vQ.Where(v => v.Stage == stageEnum);
            tQ = tQ.Where(t => t.Stage == stageEnum);
            pQ = pQ.Where(p => p.Stage == stageEnum);
            aQ = aQ.Where(a => a.Stage == stageEnum);
        }

        if (todayCutoff != null)
        {
            vQ = vQ.Where(v => v.RecordedAt >= todayCutoff);
            tQ = tQ.Where(t => t.RecordedAt >= todayCutoff);
            pQ = pQ.Where(p => p.RecordedAt >= todayCutoff);
            aQ = aQ.Where(a => a.RecordedAt >= todayCutoff);
        }

        stats.violations = await vQ.CountAsync() + await tQ.CountAsync();

        var positiveRecords = await pQ.Select(p => new { p.BehaviorType, p.Details, p.Degree }).ToListAsync();
        stats.compensation = positiveRecords.Count(p =>
            p.BehaviorType.Contains("تعويض") || p.Details.Contains("تعويض") || p.Degree.Contains("تعويض"));
        stats.excellent = positiveRecords.Count - stats.compensation;

        stats.absence = await aQ.CountAsync();

        return stats;
    }

    /// <summary>عد الموثق اليوم</summary>
    private async Task<int> CountDocumentedToday(Stage? stageEnum, DateTime today)
    {
        var docVQ = _db.Violations.Where(v => v.NoorStatus == "تم" && v.RecordedAt >= today);
        var docTQ = _db.TardinessRecords.Where(t => t.NoorStatus == "تم" && t.RecordedAt >= today);
        var docPQ = _db.PositiveBehaviors.Where(p => p.NoorStatus == "تم" && p.RecordedAt >= today);
        var docAQ = _db.DailyAbsences.Where(a => a.NoorStatus == "تم" && a.RecordedAt >= today);

        if (stageEnum != null)
        {
            docVQ = docVQ.Where(v => v.Stage == stageEnum);
            docTQ = docTQ.Where(t => t.Stage == stageEnum);
            docPQ = docPQ.Where(p => p.Stage == stageEnum);
            docAQ = docAQ.Where(a => a.Stage == stageEnum);
        }

        return await docVQ.CountAsync() + await docTQ.CountAsync()
             + await docPQ.CountAsync() + await docAQ.CountAsync();
    }

    // ====================================================================
    // تحديث حالة نور
    // ====================================================================
    [HttpPost("update-status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateStatus(
        [FromBody] NoorStatusUpdateRequest request)
    {
        int updated = 0, failed = 0;

        foreach (var update in request.Updates)
        {
            try
            {
                switch (update.Type)
                {
                    case "violation":
                        var v = await _db.Violations.FindAsync(update.Id);
                        if (v != null)
                        {
                            if (v.NoorStatus == "مستبعد" || v.NoorStatus == "لا يحتاج")
                            { failed++; continue; }
                            v.NoorStatus = update.Status;
                            updated++;
                        }
                        else failed++;
                        break;

                    case "tardiness":
                        var t = await _db.TardinessRecords.FindAsync(update.Id);
                        if (t != null)
                        {
                            if (t.NoorStatus == "مستبعد" || t.NoorStatus == "لا يحتاج")
                            { failed++; continue; }
                            t.NoorStatus = update.Status;
                            updated++;
                        }
                        else failed++;
                        break;

                    case "compensation":
                    case "excellent":
                    case "positive":
                        var p = await _db.PositiveBehaviors.FindAsync(update.Id);
                        if (p != null)
                        {
                            if (p.NoorStatus == "مستبعد" || p.NoorStatus == "لا يحتاج")
                            { failed++; continue; }
                            p.NoorStatus = update.Status;
                            updated++;
                        }
                        else failed++;
                        break;

                    case "absence":
                        var a = await _db.DailyAbsences.FindAsync(update.Id);
                        if (a != null)
                        {
                            if (a.NoorStatus == "مستبعد" || a.NoorStatus == "لا يحتاج")
                            { failed++; continue; }
                            a.NoorStatus = update.Status;
                            updated++;
                        }
                        else failed++;
                        break;

                    default:
                        failed++;
                        break;
                }
            }
            catch { failed++; }
        }

        await _db.SaveChangesAsync();

        // إشعار SignalR — الصفحة تستقبله وتعيد جلب السجلات
        await _notifications.SendAsync("noor-status-updated", new { updated, failed });

        return Ok(ApiResponse<object>.Ok(new { updated, failed }));
    }

    // ====================================================================
    // استبعاد سجلات من التوثيق في نور
    // ====================================================================
    [HttpPost("exclude")]
    public async Task<ActionResult<ApiResponse<object>>> Exclude(
        [FromBody] NoorBulkRequest request)
    {
        int updated = 0;
        foreach (var item in request.Updates)
        {
            try
            {
                switch (item.Type)
                {
                    case "violation":
                        var v = await _db.Violations.FindAsync(item.Id);
                        if (v != null && v.NoorStatus != "تم" && v.NoorStatus != "لا يحتاج")
                        { v.NoorStatus = "مستبعد"; updated++; }
                        break;
                    case "tardiness":
                        var t = await _db.TardinessRecords.FindAsync(item.Id);
                        if (t != null && t.NoorStatus != "تم" && t.NoorStatus != "لا يحتاج")
                        { t.NoorStatus = "مستبعد"; updated++; }
                        break;
                    case "compensation":
                    case "excellent":
                    case "positive":
                        var p = await _db.PositiveBehaviors.FindAsync(item.Id);
                        if (p != null && p.NoorStatus != "تم" && p.NoorStatus != "لا يحتاج")
                        { p.NoorStatus = "مستبعد"; updated++; }
                        break;
                    case "absence":
                        var a = await _db.DailyAbsences.FindAsync(item.Id);
                        if (a != null && a.NoorStatus != "تم" && a.NoorStatus != "لا يحتاج")
                        { a.NoorStatus = "مستبعد"; updated++; }
                        break;
                }
            }
            catch { /* skip */ }
        }
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { updated }));
    }

    // ====================================================================
    // استعادة سجلات مستبعدة
    // ====================================================================
    [HttpPost("restore")]
    public async Task<ActionResult<ApiResponse<object>>> Restore(
        [FromBody] NoorBulkRequest request)
    {
        int updated = 0;
        foreach (var item in request.Updates)
        {
            try
            {
                switch (item.Type)
                {
                    case "violation":
                        var v = await _db.Violations.FindAsync(item.Id);
                        if (v != null && v.NoorStatus == "مستبعد")
                        { v.NoorStatus = ""; updated++; }
                        break;
                    case "tardiness":
                        var t = await _db.TardinessRecords.FindAsync(item.Id);
                        if (t != null && t.NoorStatus == "مستبعد")
                        { t.NoorStatus = ""; updated++; }
                        break;
                    case "compensation":
                    case "excellent":
                    case "positive":
                        var p = await _db.PositiveBehaviors.FindAsync(item.Id);
                        if (p != null && p.NoorStatus == "مستبعد")
                        { p.NoorStatus = ""; updated++; }
                        break;
                    case "absence":
                        var a = await _db.DailyAbsences.FindAsync(item.Id);
                        if (a != null && a.NoorStatus == "مستبعد")
                        { a.NoorStatus = ""; updated++; }
                        break;
                }
            }
            catch { /* skip */ }
        }
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { updated }));
    }

    // ====================================================================
    // السجلات الموثقة اليوم
    // ====================================================================
    [HttpGet("documented-today")]
    public async Task<ActionResult<ApiResponse<object>>> GetDocumentedToday(
        [FromQuery] string type = "all")
    {
        var today = DateTime.Today;
        var records = new List<object>();

        if (type is "all" or "violations")
        {
            var violations = await _db.Violations
                .Where(v => (v.NoorStatus == "تم" || v.NoorStatus == "failed") && v.RecordedAt >= today)
                .Select(v => new {
                    v.Id, _type = "violation",
                    v.StudentName, v.Grade, v.Class,
                    description = v.Description ?? v.ViolationCode ?? "",
                    date = v.RecordedAt.ToString("yyyy-MM-dd"),
                    result = v.NoorStatus == "تم" ? "نجح" : "فشل"
                }).ToListAsync();
            records.AddRange(violations);

            var tardiness = await _db.TardinessRecords
                .Where(t => (t.NoorStatus == "تم" || t.NoorStatus == "failed") && t.RecordedAt >= today)
                .Select(t => new {
                    t.Id, _type = "tardiness",
                    t.StudentName, t.Grade, t.Class,
                    description = t.TardinessType.ToString(),
                    date = t.RecordedAt.ToString("yyyy-MM-dd"),
                    result = t.NoorStatus == "تم" ? "نجح" : "فشل"
                }).ToListAsync();
            records.AddRange(tardiness);
        }

        if (type is "all" or "compensation" or "excellent")
        {
            var allPositive = await _db.PositiveBehaviors
                .Where(p => (p.NoorStatus == "تم" || p.NoorStatus == "failed") && p.RecordedAt >= today)
                .Select(p => new {
                    p.Id, p.StudentName, p.Grade, p.Class,
                    behaviorType = p.BehaviorType ?? "",
                    details = p.Details ?? "",
                    degree = p.Degree.ToString(),
                    date = p.RecordedAt.ToString("yyyy-MM-dd"),
                    p.NoorStatus
                }).ToListAsync();

            foreach (var p in allPositive)
            {
                var isComp = p.behaviorType.Contains("تعويض") || p.details.Contains("تعويض")
                             || p.degree.Contains("تعويض");
                var recType = isComp ? "compensation" : "excellent";
                if (type == "all" || type == recType)
                {
                    records.Add(new {
                        p.Id, _type = recType,
                        p.StudentName, p.Grade, p.Class,
                        description = p.behaviorType != "" ? p.behaviorType : p.details,
                        p.date,
                        result = p.NoorStatus == "تم" ? "نجح" : "فشل"
                    });
                }
            }
        }

        if (type is "all" or "absence")
        {
            var absences = await _db.DailyAbsences
                .Where(a => (a.NoorStatus == "تم" || a.NoorStatus == "failed") && a.RecordedAt >= today)
                .Select(a => new {
                    a.Id, _type = "absence",
                    a.StudentName, a.Grade, a.Class,
                    description = a.AbsenceType.ToString(),
                    date = a.RecordedAt.ToString("yyyy-MM-dd"),
                    result = a.NoorStatus == "تم" ? "نجح" : "فشل"
                }).ToListAsync();
            records.AddRange(absences);
        }

        return Ok(ApiResponse<object>.Ok(new { records }));
    }

    // ====================================================================
    // جدول ربط مخالفات/سلوكيات بنظام نور
    // ====================================================================
    [HttpGet("mappings")]
    public ActionResult<ApiResponse<object>> GetMappings()
    {
        return Ok(ApiResponse<object>.Ok(NoorMappings.GetAll()));
    }

    // ====================================================================
    // إعدادات إضافة نور v7
    // ====================================================================
    /// <summary>
    /// Returns Noor page navigation and form configuration for the extension.
    /// </summary>
    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        return Ok(new
        {
            success = true,
            data = new
            {
                // Bookmark __EVENTARGUMENT to navigate from Noor homepage to ManageAttendance page.
                // This value is Noor-version-specific and may need updating.
                manageAttendanceBookmark = "Bookmark_Manage_Attendance",

                // Grade map — Phase 1: empty (extension uses built-in GRADE_MAP).
                // Phase 2: populated via calibration flow.
                gradeMap = new Dictionary<string, string>(),

                // Default section filter
                defaultSection = "الكل",

                // Minimum extension version required
                extensionMinVersion = "7.0.0"
            }
        });
    }
}

// ====================================================================
// DTOs
// ====================================================================
public class NoorStatusUpdateRequest
{
    public List<NoorStatusUpdate> Updates { get; set; } = new();
}

public class NoorStatusUpdate
{
    public int Id { get; set; }
    public string Type { get; set; } = "";     // violation, tardiness, compensation, excellent, positive, absence
    public string Status { get; set; } = "تم"; // تم أو failed
}

public class NoorPendingStats
{
    public int violations { get; set; }
    public int compensation { get; set; }
    public int excellent { get; set; }
    public int absence { get; set; }
}

public class NoorBulkRequest
{
    public List<NoorBulkItem> Updates { get; set; } = new();
}

public class NoorBulkItem
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
}

// ====================================================================
// ربط القيم بنظام نور — نسخة كاملة من NOOR_DROPDOWN_MAP في Config.gs
// تحتوي على noorText (النص الظاهر في منسدلة نور) و noorValue (القيمة الفعلية)
// ====================================================================
public static class NoorMappings
{
    // ═══ خريطة ربط أوصاف مخالفات التطبيق ← أكواد نور الرسمية ═══
    // التطبيق (DataSeeder) يستخدم نظام ترقيم خاص يختلف عن أكواد نور
    // مثال: كود "101" في التطبيق = "العبث بالمقاعد" بينما في نور = "التأخر الصباحي"
    // هذه الخريطة تربط وصف مخالفة التطبيق بكود نور الصحيح
    private static readonly Dictionary<string, string> _appDescToNoorCode = new()
    {
        // ── الدرجة الأولى (DataSeeder) ──
        ["العبث بالمقاعد والطاولات والأدوات المدرسية"] = "306",  // العبث بتجهيزات المدرسة
        ["عدم الالتزام بالزي المدرسي المعتمد"] = "301",          // عدم التقيد بالزي المدرسي
        ["التأخر عن الطابور الصباحي"] = "103",                    // التأخر عن الاصطفاف الصباحي
        ["التأخر عن الحصص"] = "104",                               // التأخر في الدخول إلى الحصص
        ["النوم أثناء الحصص"] = "106",                             // النوم داخل الفصل
        ["الأكل والشرب داخل الفصل"] = "109",                      // تناول الأطعمة أثناء الدرس
        ["إصدار أصوات مزعجة أو ضوضاء في الفصل"] = "105",         // إعاقة سير الحصص الدراسية
        ["الخروج من الفصل بدون إذن المعلم"] = "202",              // الدخول أو الخروج دون استئذان
        ["استخدام عبارات غير لائقة بين الطلاب"] = "304",          // التلفظ بكلمات نابية
        ["التأخر في العودة من الفسحة"] = "104",                    // التأخر في الدخول إلى الحصص
        // ── الدرجة الثانية (DataSeeder) ──
        ["التنمر اللفظي على الطلاب"] = "513",                     // التنمر بجميع أنواعه
        ["إثارة الفوضى في الفصل أو المدرسة"] = "204",            // إثارة الفوضى
        ["الكتابة على الجدران وتشويه الممتلكات"] = "306",        // العبث بتجهيزات المدرسة
        ["التصوير داخل المدرسة بدون إذن"] = "403",                // التصوير أو التسجيل الصوتي
        ["إحضار أجهزة إلكترونية بدون إذن"] = "307",               // إحضار المواد الخطرة (أقرب تصنيف)
        ["تزوير توقيع ولي الأمر"] = "310",                        // التوقيع عن ولي الأمر
        ["الاعتداء اللفظي على الزملاء"] = "304",                  // التلفظ بكلمات نابية
        ["العبث بممتلكات الآخرين"] = "305",                        // إلحاق الضرر بممتلكات الطلبة
        ["التدخين الإلكتروني أو حيازة أدواته"] = "405",           // التدخين بأنواعه
        ["المشاجرة البسيطة بين الطلاب"] = "302",                  // الشجار أو الاشتراك في مضاربة
        ["الخروج من المدرسة بدون إذن"] = "406",                    // الهروب من المدرسة
        // ── الدرجة الثالثة (DataSeeder) ──
        ["الاعتداء الجسدي على الطلاب"] = "401",                   // تعمد إصابة أحد الطلبة
        ["التدخين أو حيازة السجائر"] = "308",                      // حيازة السجائر بأنواعها
        ["السرقة من الطلاب أو المدرسة"] = "402",                  // سرقة شيء من ممتلكات
        ["إتلاف الممتلكات المدرسية عمداً"] = "404",               // إلحاق ضرر بتجهيزات المدرسة
        ["التنمر الإلكتروني"] = "612",                             // التنمر الإلكتروني
        ["تهديد الطلاب أو الموظفين"] = "701",                     // تهديد المعلمين أو الإداريين
        ["حيازة مواد خطرة (عدا الأسلحة)"] = "307",                // إحضار المواد الخطرة
        ["تصوير المعلمين أو الطلاب ونشرها"] = "708",              // تصوير المعلمين
        ["الهروب المتكرر من المدرسة"] = "406",                    // الهروب من المدرسة
        ["التعدي على ممتلكات خاصة بالمعلمين"] = "709",            // إلحاق الضرر بممتلكات المعلمين
        ["الاعتداء اللفظي الشديد على المعلم"] = "702",            // التلفظ بألفاظ غير لائقة تجاه المعلمين
        ["ابتزاز الطلاب"] = "512",                                 // ابتزاز الطلبة
        // ── الدرجة الرابعة (DataSeeder) ──
        ["الاعتداء الجسدي على المعلم أو الموظف"] = "703",        // الاعتداء بالضرب على المعلمين
        ["حيازة أو تعاطي المخدرات"] = "510",                      // حيازة أو تعاطي المخدرات
        ["حيازة الأسلحة البيضاء"] = "509",                         // حيازة أو استخدام الأسلحة
        ["التحرش الجسدي"] = "506",                                 // التحرش الجنسي
        ["الاعتداء الجسدي الخطير على طالب"] = "401",              // تعمد إصابة أحد الطلبة
        ["ترويج المخدرات أو المسكرات"] = "510",                   // حيازة أو تعاطي المخدرات
        ["إشعال الحرائق عمداً"] = "508",                           // إشعال النار داخل المدرسة
        ["التخريب الجسيم للممتلكات المدرسية"] = "404",            // إلحاق ضرر بتجهيزات المدرسة
        ["نشر محتوى إباحي في المدرسة"] = "507",                   // مظاهر الشذوذ الجنسي
        ["الابتزاز المالي أو الجسدي المتكرر"] = "512",            // ابتزاز الطلبة
        ["تعاطي المسكرات داخل المدرسة"] = "510",                  // حيازة أو تعاطي المخدرات
        // ── الدرجة الخامسة (DataSeeder) ──
        ["حيازة أسلحة نارية"] = "509",                              // حيازة أو استخدام الأسلحة
        ["ترويج وتوزيع المخدرات داخل المدرسة"] = "510",           // حيازة أو تعاطي المخدرات
        ["الاعتداء الجنسي"] = "506",                               // التحرش الجنسي
        // ── أوصاف شائعة يدخلها المستخدم يدوياً ──
        ["الشجار مع الزملاء"] = "302",                             // الشجار أو الاشتراك في مضاربة
        ["شجار مع الزملاء"] = "302",
        ["مشاجرة بين طلاب"] = "302",
        ["مشاجرة"] = "302",
        ["ضرب طالب"] = "401",                                       // تعمد إصابة أحد الطلبة
        ["ضرب زميل"] = "401",
        ["تأخر صباحي"] = "101",                                    // التأخر الصباحي
        ["التأخر الصباحي"] = "101",
        ["هروب من المدرسة"] = "406",                                // الهروب من المدرسة
        ["الهروب من المدرسة"] = "406",
        ["سرقة"] = "402",                                           // سرقة شيء من ممتلكات
        ["تدخين"] = "405",                                          // التدخين بأنواعه
        ["التدخين"] = "405",
        ["إثارة الفوضى"] = "204",
        ["فوضى في الفصل"] = "204",
        ["النوم في الفصل"] = "106",
        ["النوم في الحصة"] = "106",
        // ── أوصاف إضافية ظهرت في بيانات حقيقية ──
        ["العبث بممتلكات المدرسة"] = "306",                        // العبث بتجهيزات المدرسة
        ["العبث بالممتلكات المدرسية"] = "306",
        ["العبث بممتلكات"] = "306",
        ["التنمر على الزملاء"] = "513",                             // التنمر بجميع أنواعه
        ["التنمر على الطلاب"] = "513",
        ["التنمر"] = "513",
        ["تنمر"] = "513",
        ["إحضار جوال للمدرسة"] = "105",                             // إعاقة سير الحصص (أقرب تصنيف)
        ["إحضار جوال"] = "105",
        ["استخدام الجوال"] = "105",
        ["استخدام الهاتف"] = "105",
        ["إحضار هاتف"] = "105",
    };

    // كلمات عربية شائعة تُستبعد من البحث بالكلمات المفتاحية
    private static readonly HashSet<string> _stopWords = new()
    {
        "في", "من", "على", "عن", "الى", "او", "مع", "بدون",
        "داخل", "خارج", "بين", "دون", "غير", "عند", "بعد", "قبل",
        "هو", "هي", "ان", "كان", "ما", "حال", "لم", "لن",
        "عدا", "تجاه", "احد", "كافه", "بكافه", "جميع", "بجميع",
    };

    /// <summary>البحث عن كود نور المقابل لوصف مخالفة التطبيق</summary>
    public static string? GetNoorCodeForAppDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description)) return null;
        var norm = NormalizeArabicForMatch(description);

        // المستوى 1: بحث مباشر بعد التطبيع
        foreach (var kv in _appDescToNoorCode)
        {
            if (NormalizeArabicForMatch(kv.Key) == norm)
                return kv.Value;
        }

        // المستوى 2: بحث بالاحتواء
        foreach (var kv in _appDescToNoorCode)
        {
            var normKey = NormalizeArabicForMatch(kv.Key);
            if (normKey.Length > 5 && (norm.Contains(normKey) || normKey.Contains(norm)))
                return kv.Value;
        }

        // المستوى 3: بحث بالكلمات المفتاحية — أفضل تطابق بـ 2+ كلمات مشتركة
        var textWords = ExtractKeywords(norm);
        if (textWords.Count < 2) return null;

        string? bestCode = null;
        int bestScore = 1; // حد أدنى 2 كلمات

        foreach (var kv in _appDescToNoorCode)
        {
            var keyWords = ExtractKeywords(NormalizeArabicForMatch(kv.Key));
            var shared = 0;
            foreach (var w in textWords)
                if (keyWords.Contains(w)) shared++;

            if (shared > bestScore)
            {
                bestScore = shared;
                bestCode = kv.Value;
            }
        }

        return bestCode;
    }

    private static HashSet<string> ExtractKeywords(string text)
    {
        var words = new HashSet<string>();
        foreach (var w in text.Split(' '))
        {
            if (w.Length > 2 && !_stopWords.Contains(w))
                words.Add(w);
        }
        return words;
    }

    // ═══ خرائط منفصلة للوصول البرمجي ═══

    // خريطة المخالفات — ابتدائي (من Config.gs NOOR_DROPDOWN_MAP)
    private static readonly Dictionary<string, (string noorText, string noorValue)> _violations = new()
    {
        // ── الدرجة الأولى (ابتدائي) ──
        ["101"] = ("التأخر الصباحي.", "1601174,الدرجة الأولى"),
        ["102"] = ("عدم حضور الاصطفاف الصباحي ( في حال كان الطالب متواجدا داخل المدرسة ).", "1201074,الدرجة الأولى"),
        ["103"] = ("التأخر عن الاصطفاف الصباحي ( في حال كان الطالب متواجدا داخل المدرسة) أو العبث أثناءه.", "1201099,الدرجة الأولى"),
        ["104"] = ("التأخر في الدخول إلى الحصص.", "1601175,الدرجة الأولى"),
        ["106"] = ("النوم داخل الفصل.", "1201075,الدرجة الأولى"),
        ["107"] = ("تكرار خروج ودخول الطلبة من البوابة قبل وقت الحضور والانصراف.", "1201101,الدرجة الأولى"),
        ["108"] = ("التجمهر أمام بوابة المدرسة.", "1201077,الدرجة الأولى"),
        ["109"] = ("تناول الأطعمة أو المشروبات أثناء الدرس بدون استئذان.", "1601176,الدرجة الأولى"),
        ["301"] = ("عدم التقيد بالزي المدرسي.", "1601186,الدرجة الأولى"),
        // ── الدرجة الثانية (ابتدائي) ──
        ["201"] = ("عدم حضور الحصة الدراسية أو الهروب منها.", "1201081,الدرجة الثانية"),
        ["202"] = ("الدخول أو الخـروج مـن الفصـل دون اسـتئذان", "1601190,الدرجة الثانية"),
        ["203"] = ("دخول فصل آخر دون استئذان.", "1601177,الدرجة الثانية"),
        ["204"] = ("إثارة الفوضى داخل الفصل أو المدرسة، أو في وسائل النقل المدرسي.", "1201102,الدرجة الثانية"),
        ["302"] = ("الشجار أو الاشتراك في مضاربة جماعية.", "1201106,الدرجة الثانية"),
        ["303"] = ("الإشارة بحركات مخلة بالأدب تجاه الطلبة.", "1201105,الدرجة الثانية"),
        ["304"] = ("التلفظ بكلمات نابية على الطلبة، أو تهديدهم، أو السخرية منهم.", "1201080,الدرجة الثانية"),
        ["305"] = ("إلحاق الضرر المتعمد بممتلكات الطلبة.", "1201079,الدرجة الثانية"),
        ["306"] = ("العبث بتجهيزات المدرسة أو مبانيها (كأجهزة الحاسوب، أدوات ومعدات الأمن والسلامة المدرسية ، الكهرباء ، المعامل ،حافلة المدرسة، والكتابة على الجدار وغيره).", "1201082,الدرجة الثانية"),
        ["311"] = ("امتهان الكتب الدراسية.", "1201108,الدرجة الثانية"),
        // ── الدرجة الثالثة (ابتدائي) ──
        ["310"] = ("التوقيع عن ولي الأمر من غير علمه على المكاتبات المتبادلة بين المدرسة وولي الأمر.", "1201089,الدرجة الثالثة"),
        ["401"] = ("التعرض لأحــد الطلبة بالضــرب.", "1601213,الدرجة الثالثة"),
        ["402"] = ("سرقة شيء من ممتلكات الطلبة أو المدرسة.", "1601188,الدرجة الثالثة"),
        ["403"] = ("التصوير أو التسجيل الصوتي للطلبة.", "1201119,الدرجة الثالثة"),
        ["404"] = ("إلحاق الضرر المتعمد بتجهيزات المدرسة أو مبانيها (كأجهزة الحاسوب ، أدوات ومعدات الأمن والسلامة المدرسية، الكهرباء، المعامل، الحافلة المدرسية).", "1201084,الدرجة الثالثة"),
        ["406"] = ("الهروب من المدرسة.", "1201092,الدرجة الثالثة"),
        ["407"] = ("إحضار أو استخدام المواد أو الألعاب الخطرة إلى المدرسة، مثل (الألعاب النارية، البخاخات الغازية الملونة، المواد الكيميائية).", "1601184,الدرجة الثالثة"),
        // ── الدرجة الرابعة (ابتدائي) ──
        ["308"] = ("حيازة السجائر بأنواعها.", "1201097,الدرجة الرابعة"),
        ["309"] = ("حيازة أو عرض المواد الإعلامية الممنوعة المقروءة، أو المسموعة ، أو المرئية.", "1601189,الدرجة الرابعة"),
        ["405"] = ("التدخين بأنواعه داخل المدرسة.", "1201114,الدرجة الرابعة"),
        ["501"] = ("الإساءة أو الاستهزاء بشيء من شعائر الإسلام.", "1201121,الدرجة الرابعة"),
        ["502"] = ("الإساءة للدولة أو رموزها.", "1201122,الدرجة الرابعة"),
        ["506"] = ("التحرش الجنسي.", "1201095,الدرجة الرابعة"),
        ["507"] = ("المظاهر أو الصور أو الشعارات التي تدل على الشذوذ الجنسي أو الترويج لها.", "1601179,الدرجة الرابعة"),
        ["508"] = ("إشعال النار داخل المدرسة.", "1201096,الدرجة الرابعة"),
        ["509"] = ("حيازة آلة حادة ( مثل السكاكين).", "1601178,الدرجة الرابعة"),
        ["511"] = ("الجرائم المعلوماتية بكافة أنواعها.", "1201126,الدرجة الرابعة"),
        ["513"] = ("التنمر بجميع أنواعه وأشكاله.", "1601185,الدرجة الرابعة"),
        ["702"] = ("التلفظ بألفاظ غير لائقة تجاه المعلمين، أو الإداريين، أو من في حكمهم من منسوبي المدرسة.", "1201129,الدرجة الرابعة"),
        ["706"] = ("السخرية من المعلمين أو الإداريين أو من في حكمهم من منسوبي المدرسة، قولًا أو فعلًا.", "1601214,الدرجة الرابعة"),
        ["707"] = ("التوقيع عن أحد منسوبي المدرسة على المكاتبات المتبادلة بين المدرسة وأولياء الأمور.", "1201131,الدرجة الرابعة"),
        ["708"] = ("تصوير المعلمين أو الإداريين، أو من في حكمهم من منسوبي المدرسة، أو التسجيل الصوتي لهم ( مالم يؤخذ إذن خطي بالموافقة الصريحة على ذلك).", "1201132,الدرجة الرابعة"),
        // ── الدرجة الخامسة (ابتدائي) ──
        ["703"] = ("الاعتداء بالضرب على المعلمين أو الإداريين أو من في حكمهم من منسوبي المدرسة.", "1201135,الدرجة الخامسة"),
        ["704"] = ("ابتزاز المعلمين، أو الإداريين ، أو من في حكمهم من منسوبي المدرسة.", "1201136,الدرجة الخامسة"),
        ["705"] = ("الجرائم المعلوماتية تجاه المعلمين أو الإداريين أو من في حكمهم من منسوبي المدرسة.", "1601183,الدرجة الخامسة"),
        ["709"] = ("إلحاق الضرر بممتلكات المعلمين أو الإداريين، أو من في حكمهم من منسوبي المدرسة، أو سرقتها.", "1201133,الدرجة الخامسة"),
        ["710"] = ("الإشارة بحركات مخلة بالأدب تجاه المعلمين أو الإداريين، أو من في حكمهم من منسوبي المدرسة.", "1201134,الدرجة الخامسة"),
    };

    // خريطة المخالفات العامة — متوسط/ثانوي (من JS_Noor.html NOOR_MAPPING)
    private static readonly Dictionary<string, (string noorText, string noorValue)> _violationsGeneral = new()
    {
        // الدرجة الأولى (8 مخالفات)
        ["101"] = ("التأخر الصباحي.", "1601174,الدرجة الأولى"),
        ["102"] = ("عدم حضور الاصطفاف الصباحي.", "1201074,الدرجة الأولى"),
        ["103"] = ("التأخر عن الاصطفاف الصباحي أو العبث أثناءه.", "1201099,الدرجة الأولى"),
        ["104"] = ("التأخر في الدخول إلى الحصص.", "1601175,الدرجة الأولى"),
        ["105"] = ("إعاقة سير الحصص الدراسية.", "1201100,الدرجة الأولى"),
        ["106"] = ("النوم داخل الفصل.", "1201075,الدرجة الأولى"),
        ["107"] = ("تكرار الخروج والدخول من البوابة.", "1201101,الدرجة الأولى"),
        ["108"] = ("التجمهر أمام بوابة المدرسة.", "1201077,الدرجة الأولى"),
        ["109"] = ("تناول الأطعمة أو المشروبات أثناء الدرس بدون استئذان.", "1601176,الدرجة الأولى"),
        // الدرجة الثانية (4 مخالفات)
        ["201"] = ("عدم حضور الحصة أو الهروب منها.", "1201081,الدرجة الثانية"),
        ["202"] = ("الدخول أو الخروج من الفصل دون استئذان.", "1601190,الدرجة الثانية"),
        ["203"] = ("دخول فصل آخر دون استئذان.", "1601177,الدرجة الثانية"),
        ["204"] = ("إثارة الفوضى.", "1201102,الدرجة الثانية"),
        // الدرجة الثالثة (11 مخالفة)
        ["301"] = ("عدم التقيد بالزي المدرسي.", "1601186,الدرجة الثالثة"),
        ["302"] = ("الشجار أو الاشتراك في مضاربة.", "1201106,الدرجة الثالثة"),
        ["303"] = ("الإشارة بحركات مخلة بالأدب تجاه الطلبة.", "1201105,الدرجة الثالثة"),
        ["304"] = ("التلفظ بكلمات نابية.", "1201080,الدرجة الثالثة"),
        ["305"] = ("إلحاق الضرر المتعمد بممتلكات الطلبة.", "1201079,الدرجة الثالثة"),
        ["306"] = ("العبث بتجهيزات المدرسة أو مبانيها.", "1201082,الدرجة الثالثة"),
        ["307"] = ("إحضار المواد الخطرة دون استخدامها.", "1201110,الدرجة الثالثة"),
        ["308"] = ("حيازة السجائر بأنواعها.", "1201097,الدرجة الثالثة"),
        ["309"] = ("حيازة المواد الإعلامية الممنوعة.", "1201109,الدرجة الثالثة"),
        ["310"] = ("التوقيع عن ولي الأمر.", "1201089,الدرجة الثالثة"),
        ["311"] = ("امتهان الكتب الدراسية.", "1201108,الدرجة الثالثة"),
        // الدرجة الرابعة (8 مخالفات)
        ["401"] = ("تعمد إصابة أحد الطلبة.", "1201113,الدرجة الرابعة"),
        ["402"] = ("سرقة شيء من ممتلكات الطلبة أو المدرسة.", "1601188,الدرجة الرابعة"),
        ["403"] = ("التصوير أو التسجيل الصوتي.", "1201132,الدرجة الرابعة"),
        ["404"] = ("إلحاق ضرر جسيم بتجهيزات المدرسة.", "1201082,الدرجة الثالثة"),
        ["405"] = ("التدخين بأنواعه داخل المدرسة.", "1201114,الدرجة الرابعة"),
        ["406"] = ("الهروب من المدرسة.", "1201092,الدرجة الرابعة"),
        ["407"] = ("إحضار أو استخدام المواد الخطرة.", "1601184,الدرجة الرابعة"),
        ["408"] = ("عرض أو توزيع المواد الإعلامية الممنوعة.", "1201115,الدرجة الرابعة"),
        // الدرجة الخامسة (13 مخالفة)
        ["501"] = ("الإساءة أو الاستهزاء بشعائر الإسلام.", "1201121,الدرجة الخامسة"),
        ["502"] = ("الإساءة للدولة أو رموزها.", "1201122,الدرجة الخامسة"),
        ["503"] = ("بث أفكار متطرفة أو إلحادية.", "1201121,الدرجة الخامسة"),
        ["504"] = ("الإساءة للأديان السماوية أو إثارة العنصرية.", "1601181,الدرجة الخامسة"),
        ["505"] = ("التزوير أو استخدام الأختام الرسمية.", "1201131,الدرجة الرابعة"),
        ["506"] = ("التحرش الجنسي.", "1201095,الدرجة الخامسة"),
        ["507"] = ("مظاهر أو شعارات الشذوذ الجنسي.", "1601179,الدرجة الخامسة"),
        ["508"] = ("إشعال النار داخل المدرسة.", "1201096,الدرجة الخامسة"),
        ["509"] = ("حيازة أو استخدام الأسلحة.", "1201125,الدرجة الخامسة"),
        ["510"] = ("حيازة أو تعاطي أو ترويج المخدرات.", "1201127,الدرجة الخامسة"),
        ["511"] = ("الجرائم المعلوماتية بكافة أنواعها.", "1201126,الدرجة الخامسة"),
        ["512"] = ("ابتزاز الطلبة.", "1201128,الدرجة الخامسة"),
        ["513"] = ("التنمر بجميع أنواعه.", "1601185,الدرجة الخامسة"),
        // المخالفات الرقمية (601-620)
        ["601"] = ("التأخر في حضور الحصة الافتراضية.", "1601175,الدرجة الأولى"),
        ["602"] = ("الخروج المتكرر من الحصص الافتراضية.", "1201101,الدرجة الأولى"),
        ["603"] = ("إعاقة سير الحصص الافتراضية.", "1201100,الدرجة الأولى"),
        ["604"] = ("الهروب من الحصة الافتراضية.", "1201081,الدرجة الثانية"),
        ["605"] = ("إرسال متعمد لمواد غير مرتبطة.", "1201102,الدرجة الثانية"),
        ["606"] = ("استخدام صور منافية للقيم.", "1201105,الدرجة الثالثة"),
        ["607"] = ("التلفظ بكلمات نابية (رقمي).", "1201080,الدرجة الثالثة"),
        ["608"] = ("تصوير الدروس الافتراضية ونشرها.", "1201109,الدرجة الثالثة"),
        ["609"] = ("إساءة استخدام معلومات الدخول.", "1201089,الدرجة الثالثة"),
        ["610"] = ("إرسال صور مخلة بالآداب.", "1201115,الدرجة الرابعة"),
        ["611"] = ("التصوير/التسجيل الصوتي (رقمي).", "1201132,الدرجة الرابعة"),
        ["612"] = ("التنمر الإلكتروني.", "1601185,الدرجة الخامسة"),
        ["613"] = ("التحرش الجنسي الإلكتروني.", "1201095,الدرجة الخامسة"),
        ["614"] = ("الإساءة لشعائر الإسلام (إلكتروني).", "1201121,الدرجة الخامسة"),
        ["615"] = ("الإساءة للدولة أو رموزها (إلكتروني).", "1201122,الدرجة الخامسة"),
        ["616"] = ("بث أفكار متطرفة (إلكتروني).", "1601180,الدرجة الخامسة"),
        ["617"] = ("ابتزاز الطلبة (إلكتروني).", "1201128,الدرجة الخامسة"),
        ["618"] = ("مظاهر الشذوذ الجنسي (إلكتروني).", "1601179,الدرجة الخامسة"),
        ["619"] = ("الترويج للمخدرات (إلكتروني).", "1201127,الدرجة الخامسة"),
        ["620"] = ("الجرائم المعلوماتية (إلكتروني).", "1201126,الدرجة الخامسة"),
        // مخالفات الهيئة التعليمية (701-710)
        ["701"] = ("تهديد المعلمين أو الإداريين.", "1201116,الدرجة الرابعة"),
        ["702"] = ("التلفظ بألفاظ غير لائقة تجاه المعلمين.", "1201129,الدرجة الرابعة"),
        ["703"] = ("الاعتداء بالضرب على المعلمين.", "1201135,الدرجة الخامسة"),
        ["704"] = ("ابتزاز المعلمين أو الإداريين.", "1201136,الدرجة الخامسة"),
        ["705"] = ("الجرائم المعلوماتية تجاه المعلمين.", "1601183,الدرجة الخامسة"),
        ["706"] = ("السخرية من المعلمين أو الإداريين.", "1601214,الدرجة الرابعة"),
        ["707"] = ("التوقيع عن أحد منسوبي المدرسة.", "1201131,الدرجة الرابعة"),
        ["708"] = ("تصوير المعلمين أو التسجيل الصوتي.", "1201132,الدرجة الرابعة"),
        ["709"] = ("إلحاق الضرر بممتلكات المعلمين أو سرقتها.", "1201133,الدرجة الخامسة"),
        ["710"] = ("الإشارة بحركات مخلة تجاه المعلمين.", "1201134,الدرجة الخامسة"),
    };

    // تجاوزات المرحلة الابتدائية — من JS_Noor.html violations_ابتدائي
    private static readonly Dictionary<string, string?> _violationsPrimaryOverrides = new()
    {
        ["105"] = null,
        ["109"] = "1601176,الدرجة الأولى",
        ["301"] = "1601186,الدرجة الأولى", ["302"] = "1201106,الدرجة الثانية",
        ["303"] = "1201105,الدرجة الثانية", ["304"] = "1201080,الدرجة الثانية",
        ["305"] = "1201079,الدرجة الثانية", ["306"] = "1201082,الدرجة الثانية",
        ["307"] = null, ["308"] = "1201097,الدرجة الرابعة",
        ["309"] = "1601189,الدرجة الرابعة", ["311"] = "1201108,الدرجة الثانية",
        ["401"] = "1601213,الدرجة الثالثة", ["402"] = "1601188,الدرجة الثالثة",
        ["404"] = "1201084,الدرجة الثالثة", ["406"] = "1201092,الدرجة الثالثة",
        ["407"] = "1601184,الدرجة الثالثة", ["408"] = "1601189,الدرجة الرابعة",
        ["501"] = "1201121,الدرجة الرابعة", ["502"] = "1201122,الدرجة الرابعة",
        ["503"] = "1201121,الدرجة الرابعة", ["504"] = null,
        ["506"] = "1201095,الدرجة الرابعة", ["507"] = "1601179,الدرجة الرابعة",
        ["508"] = "1201096,الدرجة الرابعة", ["509"] = "1601178,الدرجة الرابعة",
        ["510"] = null, ["511"] = "1201126,الدرجة الرابعة", ["512"] = null,
        ["513"] = "1601185,الدرجة الرابعة",
        ["606"] = "1201105,الدرجة الثانية", ["607"] = "1201080,الدرجة الثانية",
        ["608"] = null, ["610"] = "1201115,الدرجة الثالثة",
        ["611"] = "1201132,الدرجة الثالثة", ["612"] = "1601185,الدرجة الرابعة",
        ["613"] = "1201095,الدرجة الرابعة", ["614"] = "1201121,الدرجة الرابعة",
        ["615"] = "1201122,الدرجة الرابعة", ["616"] = null, ["617"] = null,
        ["618"] = "1601179,الدرجة الرابعة", ["619"] = null,
        ["620"] = "1201126,الدرجة الرابعة",
    };

    private static readonly Dictionary<string, (string noorText, string noorValue)> _excellent = new()
    {
        ["انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي"] = ("انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي. (سلوك متميز)", "1601248,"),
        ["التعاون مع الزملاء والمعلمين وإدارة المدرسة"] = ("التعاون مع الزملاء والمعلمين وإدارة المدرسة. (سلوك متميز)", "1601240,"),
        ["المشاركة في الإذاعة"] = ("المشاركة في الإذاعة. (سلوك متميز)", "1601241,"),
        ["المشاركة في الخدمة المجتمعية خارج المدرسة"] = ("المشاركة في الخدمة المجتمعية خارج المدرسة. (سلوك متميز)", "1601242,"),
        ["المشاركة في أنشطة المهارات الرقمية"] = ("المشاركة في أنشطة المهارات الرقمية( إعداد العروض، تصميم المحتوى الإلكتروني ). (سلوك متميز)", "1601243,"),
        ["المشاركة في أنشطة مهارات الاتصال"] = ("المشاركة في أنشطة مهارات الاتصال ( العمل الجماعي ، التعلم بالأقران،..). (سلوك متميز)", "1601244,"),
        ["المشاركة في أنشطة مهارات القيادة والمسؤولية"] = ("المشاركة في أنشطة مهارات القيادة والمسؤولية (التخطيط، التحفيز،..). (سلوك متميز)", "1601245,"),
        ["المشاركة في أنشطة مهارة إدارة الوقت"] = ("المشاركة في أنشطة مهارة إدارة الوقت. (سلوك متميز)", "1601246,"),
        ["المشاركة في حملة توعوية"] = ("المشاركة في حملة توعوية. (سلوك متميز)", "1601247,"),
        ["تقديم فعالية حوارية"] = ("تقديم فعالية حوارية. (سلوك متميز)", "1601249,"),
        ["تقديم مقترح لصالح المجتمع المدرسي"] = ("تقديم مقترح لصالح المجتمع المدرسي. (سلوك متميز)", "1601250,"),
        ["عرض تجارب شخصية ناجحة"] = ("عرض تجارب شخصية ناجحة. (سلوك متميز)", "1601251,"),
        ["كتابة رسالة شكر"] = ("كتابة رسالة شكر(مثلا رسالة للوطن، للقيادة الرشيدة. للأسرة، للمعلم...إلخ). (سلوك متميز)", "1601252,"),
        ["الالتحاق ببرنامج أو دورة"] = ("الالتحاق ببرنامج أو دورة . (سلوك متميز)", "1601239,"),
        ["أخرى (بناءً على توصية لجنة التوجيه الطلابي) متميز"] = ("أخرى ( بناءً على توصية لجنة التوجيه الطلابي) (سلوك متميز)", "1601234,"),
    };

    private static readonly Dictionary<string, (string noorText, string noorValue)> _compensation = new()
    {
        ["انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي"] = ("انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي. (فرص تعويض)", "189,"),
        ["التعاون مع الزملاء والمعلمين وإدارة المدرسة"] = ("التعاون مع الزملاء والمعلمين وإدارة المدرسة. (فرص تعويض)", "1201017,"),
        ["المشاركة في الإذاعة"] = ("المشاركة في الإذاعة. (فرص تعويض)", "1601204,"),
        ["المشاركة في الخدمة المجتمعية خارج المدرسة"] = ("المشاركة في الخدمة المجتمعية خارج المدرسة. (فرص تعويض)", "1601194,"),
        ["المشاركة في أنشطة المهارات الرقمية"] = ("المشاركة في أنشطة المهارات الرقمية( إعداد العروض، تصميم المحتوى الإلكتروني ). (فرص تعويض)", "1601201,"),
        ["المشاركة في أنشطة مهارات الاتصال"] = ("المشاركة في أنشطة مهارات الاتصال ( العمل الجماعي ، التعلم بالأقران،..). (فرص تعويض)", "1601199,"),
        ["المشاركة في أنشطة مهارات القيادة والمسؤولية"] = ("المشاركة في أنشطة مهارات القيادة والمسؤولية (التخطيط، التحفيز،..). (فرص تعويض)", "1601200,"),
        ["المشاركة في أنشطة مهارة إدارة الوقت"] = ("المشاركة في أنشطة مهارة إدارة الوقت. (فرص تعويض)", "1601202,"),
        ["المشاركة في حملة توعوية"] = ("المشاركة في حملة توعوية. (فرص تعويض)", "1601196,"),
        ["تقديم فعالية حوارية"] = ("تقديم فعالية حوارية. (فرص تعويض)", "1601195,"),
        ["تقديم مقترح لصالح المجتمع المدرسي"] = ("تقديم مقترح لصالح المجتمع المدرسي. (فرص تعويض)", "1601205,"),
        ["عرض تجارب شخصية ناجحة"] = ("عرض تجارب شخصية ناجحة. (فرص تعويض)", "1601197,"),
        ["كتابة رسالة شكر"] = ("كتابة رسالة شكر(مثلا رسالة للوطن، للقيادة الرشيدة. للأسرة، للمعلم...إلخ). (فرص تعويض)", "1601203,"),
        ["الالتحاق ببرنامج أو دورة"] = ("الالتحاق ببرنامج أو دورة . (فرص تعويض)", "1601198,"),
        ["أخرى (بناءً على توصية لجنة التوجيه الطلابي) تعويض"] = ("اخرى ( بناءً على توصية لجنة التوجيه الطلابي) (فرص تعويض)", "1601207,"),
    };

    private static readonly Dictionary<string, (string noorText, string noorValue)> _absence = new()
    {
        ["غائب"] = ("الغياب بدون عذر مقبول", "48,"),
        ["غياب بدون عذر"] = ("الغياب بدون عذر مقبول", "48,"),
        ["الغياب بدون عذر مقبول"] = ("الغياب بدون عذر مقبول", "48,"),
        ["غياب بعذر"] = ("الغياب بعذر", "141,"),
        ["الغياب بعذر"] = ("الغياب بعذر", "141,"),
        ["غياب منصة بعذر"] = ("الغياب بعذر مقبول عبر منصة مدرستي", "800667,"),
        ["الغياب بعذر مقبول عبر منصة مدرستي"] = ("الغياب بعذر مقبول عبر منصة مدرستي", "800667,"),
        ["غياب منصة بدون عذر"] = ("الغياب بدون عذر مقبول عبر منصة مدرستي", "1201153,"),
        ["الغياب بدون عذر مقبول عبر منصة مدرستي"] = ("الغياب بدون عذر مقبول عبر منصة مدرستي", "1201153,"),
    };

    // ═══ واجهات الوصول ═══

    public static Dictionary<string, (string noorText, string noorValue)> GetViolationsMap() => _violations;
    public static Dictionary<string, (string noorText, string noorValue)> GetViolationsGeneralMap() => _violationsGeneral;
    public static Dictionary<string, (string noorText, string noorValue)> GetExcellentMap() => _excellent;
    public static Dictionary<string, (string noorText, string noorValue)> GetCompensationMap() => _compensation;
    public static Dictionary<string, (string noorText, string noorValue)> GetAbsenceMap() => _absence;

    /// <summary>
    /// بحث عن مخالفة حسب المرحلة — مطابق لـ noorResolveValue_ في JS_Noor.html
    /// ابتدائي: فحص التجاوزات أولاً ثم العام | متوسط/ثانوي: العام مباشرة
    /// </summary>
    public static (string? noorText, string? noorValue) GetViolationByStage(string code, string stage)
    {
        if (string.IsNullOrEmpty(code)) return (null, null);

        // ابتدائي: فحص التجاوزات أولاً
        if (stage.Contains("ابتدا") || stage.Contains("Primary"))
        {
            if (_violationsPrimaryOverrides.TryGetValue(code, out var overrideVal))
            {
                if (overrideVal == null) return (null, null); // مخالفة غير مطبقة في ابتدائي
                // البحث عن النص في الخريطة العامة
                if (_violationsGeneral.TryGetValue(code, out var genMapping))
                    return (genMapping.noorText, overrideVal);
                return (code, overrideVal);
            }
        }

        // البحث في الخريطة العامة (متوسط/ثانوي أو ابتدائي بدون تجاوز)
        if (_violationsGeneral.TryGetValue(code, out var mapping))
            return (mapping.noorText, mapping.noorValue);

        // fallback: ابتدائي
        if (_violations.TryGetValue(code, out var fallback))
            return (fallback.noorText, fallback.noorValue);

        return (null, null);
    }

    /// <summary>بحث عن مخالفة بالنص (خطة بديلة عندما يكون رقم المخالفة غير متوفر)</summary>
    public static (string noorText, string noorValue)? FindNoorViolationByText(string text, string stage = "")
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var norm = NormalizeArabicForMatch(text);
        bool isPrimary = stage.Contains("ابتدا") || stage.Contains("Primary");

        // البحث في الخريطة المناسبة للمرحلة أولاً
        var primaryMap = isPrimary ? _violations : _violationsGeneral;
        var fallbackMap = isPrimary ? _violationsGeneral : _violations;

        foreach (var kv in primaryMap)
        {
            var noorNorm = NormalizeArabicForMatch(kv.Value.noorText);
            if (noorNorm.Contains(norm) || norm.Contains(noorNorm))
            {
                // للابتدائي: تطبيق التجاوزات
                if (isPrimary && _violationsPrimaryOverrides.TryGetValue(kv.Key, out var ov))
                {
                    if (ov == null) continue; // غير مطبقة في ابتدائي
                    return (kv.Value.noorText, ov);
                }
                return kv.Value;
            }
        }

        // بحث في الخريطة البديلة
        foreach (var kv in fallbackMap)
        {
            var noorNorm = NormalizeArabicForMatch(kv.Value.noorText);
            if (noorNorm.Contains(norm) || norm.Contains(noorNorm))
                return kv.Value;
        }

        return null;
    }

    /// <summary>الواجهة العامة — تُرجع كل الخرائط للعميل (بصيغة anonymous objects)</summary>
    public static object GetAll() => new
    {
        modes = new Dictionary<string, object>
        {
            ["absence"]      = new { mowadaba = "2", deductType = (string?)null },
            ["violation"]    = new { mowadaba = "1", deductType = "1" },
            ["tardiness"]    = new { mowadaba = "1", deductType = "1" },
            ["compensation"] = new { mowadaba = "1", deductType = "2" },
            ["excellent"]    = new { mowadaba = "1", deductType = "2" },
        },

        absence = _absence.ToDictionary(kv => kv.Key, kv => (object)new { noorText = kv.Value.noorText, noorValue = kv.Value.noorValue }),
        violations = _violationsGeneral.ToDictionary(kv => kv.Key, kv => (object)new { noorText = kv.Value.noorText, noorValue = kv.Value.noorValue }),
        violationsPrimaryMap = _violations.ToDictionary(kv => kv.Key, kv => (object)new { noorText = kv.Value.noorText, noorValue = kv.Value.noorValue }),

        tardiness = new { noorText = "التأخر الصباحي.", noorValue = "1601174,الدرجة الأولى" },

        excellent = _excellent.ToDictionary(kv => kv.Key, kv => (object)new { noorText = kv.Value.noorText, noorValue = kv.Value.noorValue }),
        compensation = _compensation.ToDictionary(kv => kv.Key, kv => (object)new { noorText = kv.Value.noorText, noorValue = kv.Value.noorValue }),

        grades = new Dictionary<string, Dictionary<string, string>>
        {
            ["Primary"] = new() {
                ["الأول"] = "1,1", ["الثاني"] = "2,1", ["الثالث"] = "3,1",
                ["الرابع"] = "4,1", ["الخامس"] = "5,1", ["السادس"] = "6,1"
            },
            ["Intermediate"] = new() {
                ["الأول"] = "7,1", ["الثاني"] = "8,1", ["الثالث"] = "9,1"
            },
            ["Secondary"] = new() {
                ["الأول"] = "10,1", ["الثاني"] = "11,1", ["الثالث"] = "12,1"
            }
        },

        violationsPrimary = new Dictionary<string, string?>
        {
            // تجاوزات المرحلة الابتدائية — مطابق لـ violations_ابتدائي في JS_Noor.html
            ["105"] = null,
            ["109"] = "1601176,الدرجة الأولى",
            ["301"] = "1601186,الدرجة الأولى",
            ["302"] = "1201106,الدرجة الثانية",
            ["303"] = "1201105,الدرجة الثانية",
            ["304"] = "1201080,الدرجة الثانية",
            ["305"] = "1201079,الدرجة الثانية",
            ["306"] = "1201082,الدرجة الثانية",
            ["307"] = null,
            ["308"] = "1201097,الدرجة الرابعة",
            ["309"] = "1601189,الدرجة الرابعة",
            ["311"] = "1201108,الدرجة الثانية",
            ["401"] = "1601213,الدرجة الثالثة",
            ["402"] = "1601188,الدرجة الثالثة",
            ["404"] = "1201084,الدرجة الثالثة",
            ["406"] = "1201092,الدرجة الثالثة",
            ["407"] = "1601184,الدرجة الثالثة",
            ["408"] = "1601189,الدرجة الرابعة",
            ["501"] = "1201121,الدرجة الرابعة",
            ["502"] = "1201122,الدرجة الرابعة",
            ["503"] = "1201121,الدرجة الرابعة",
            ["504"] = null,
            ["506"] = "1201095,الدرجة الرابعة",
            ["507"] = "1601179,الدرجة الرابعة",
            ["508"] = "1201096,الدرجة الرابعة",
            ["509"] = "1601178,الدرجة الرابعة",
            ["510"] = null,
            ["511"] = "1201126,الدرجة الرابعة",
            ["512"] = null,
            ["513"] = "1601185,الدرجة الرابعة",
            ["606"] = "1201105,الدرجة الثانية",
            ["607"] = "1201080,الدرجة الثانية",
            ["608"] = null,
            ["610"] = "1201115,الدرجة الثالثة",
            ["611"] = "1201132,الدرجة الثالثة",
            ["612"] = "1601185,الدرجة الرابعة",
            ["613"] = "1201095,الدرجة الرابعة",
            ["614"] = "1201121,الدرجة الرابعة",
            ["615"] = "1201122,الدرجة الرابعة",
            ["616"] = null,
            ["617"] = null,
            ["618"] = "1601179,الدرجة الرابعة",
            ["619"] = null,
            ["620"] = "1201126,الدرجة الرابعة",
        },

        noorIds = new Dictionary<string, string>
        {
            ["system"]     = "ctl00_PlaceHolderMain_ddlSystemStyudy",
            ["grade"]      = "ctl00_PlaceHolderMain_oDistributionSearch_ddlClass",
            ["specialty"]  = "ctl00_PlaceHolderMain_oDistributionSearch_ddlSpecialty",
            ["section"]    = "ctl00_PlaceHolderMain_oDistributionSearch_ddlSection",
            ["mowadaba"]   = "ctl00_PlaceHolderMain_ddlMowadaba",
            ["deductType"] = "ctl00_PlaceHolderMain_ddlDeductType",
            ["students"]   = "ctl00_PlaceHolderMain_ddlStudents",
            ["violation"]  = "ctl00_PlaceHolderMain_ddlViolation",
            ["btnSearch"]  = "ctl00_PlaceHolderMain_ibtnSearch",
            ["btnSave"]    = "ctl00_PlaceHolderMain_ibtnSave",
            ["grid"]       = "ctl00_PlaceHolderMain_gvClassStudentsAttendance",
        },

        // إعدادات فلاتر نور — مطابق لـ noorFilters في JS_Noor.html
        noorFilters = new
        {
            mowadaba = new { behavior = "1", attendance = "2" },
            deductType = new { violation = "1", positive = "2" },
            absenceType = new { fullDay = "1", period = "2" }
        },

        // خيارات نوع الغياب — مطابق لـ ABSENCE_TYPE_OPTIONS
        absenceTypeOptions = new[]
        {
            new { label = "غياب بعذر",         value = "141," },
            new { label = "غياب بدون عذر",     value = "48," },
            new { label = "غياب منصة بعذر",    value = "800667," },
            new { label = "غياب منصة بدون عذر", value = "1201153," },
        }
    };

    // ====================================================================
    // دوال المساعدة — منقولة من Config.gs
    // ====================================================================

    /// <summary>تطبيع النص العربي — إزالة الترقيم وتوحيد الحروف</summary>
    public static string NormalizeArabicForMatch(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        return text.Trim()
            .Replace(".", "").Replace("،", "").Replace(",", "").Replace("؛", "")
            .Replace(":", "").Replace("!", "").Replace("؟", "")
            .Replace("\u200c", "").Replace("\u200d", "")
            .Replace("أ", "ا").Replace("إ", "ا").Replace("آ", "ا")
            .Replace("ة", "ه").Replace("ى", "ي")
            .Trim();
    }

    /// <summary>تنظيف اسم الصف — إزالة لواحق نور وتوحيد التسمية</summary>
    public static string CleanGradeName(string grade)
    {
        if (string.IsNullOrWhiteSpace(grade)) return "";
        var s = grade.Replace("_", " ").Trim();
        foreach (var suffix in new[] { "قسم عام", "السنة المشتركة", "نظام عام", "المسار العام" })
            s = s.Replace(suffix, "").Trim();
        s = System.Text.RegularExpressions.Regex.Replace(s, @"(^|\s)المتوسط(\s|$)", "$1متوسط$2");
        s = System.Text.RegularExpressions.Regex.Replace(s, @"(^|\s)الثانوي(\s|$)", "$1ثانوي$2");
        s = System.Text.RegularExpressions.Regex.Replace(s, @"(^|\s)الابتدائي(\s|$)", "$1ابتدائي$2");
        return System.Text.RegularExpressions.Regex.Replace(s, @"\s+", " ").Trim();
    }

    /// <summary>اكتشاف المرحلة من اسم الصف</summary>
    public static string DetectStageFromGrade(string grade)
    {
        if (string.IsNullOrEmpty(grade)) return "";
        if (grade.Contains("ثانو")) return "ثانوي";
        if (grade.Contains("متوسط")) return "متوسط";
        if (grade.Contains("ابتدا")) return "ابتدائي";
        if (grade.Contains("طفولة") || grade.Contains("روضة")) return "طفولة مبكرة";
        return "";
    }

    /// <summary>
    /// بحث ذكي في خريطة نور عن أقرب تطابق نصي
    /// 4 مستويات: مباشر → تطبيع → جزئي (بدون أخرى) → أخرى fallback
    /// مطابق لـ noorMatchPositive_ في JS_Noor.html + findNoorMapping_ في Config.gs
    /// </summary>
    public static (string? NoorText, string? NoorValue) FindNoorMapping(
        Dictionary<string, (string noorText, string noorValue)> map, string text)
    {
        if (map == null || string.IsNullOrWhiteSpace(text)) return (null, null);

        // 1. بحث مباشر بالمفتاح
        if (map.TryGetValue(text, out var direct))
            return (direct.noorText, direct.noorValue);

        var norm = NormalizeArabicForMatch(text);

        // 2. بحث بالمفتاح بعد التطبيع
        foreach (var kv in map)
        {
            if (NormalizeArabicForMatch(kv.Key) == norm)
                return (kv.Value.noorText, kv.Value.noorValue);
        }

        // 3. بحث جزئي — تخطي "أخرى" (مطابق لـ noorMatchPositive_)
        foreach (var kv in map)
        {
            if (kv.Key.Contains("أخرى")) continue;
            var normKey = NormalizeArabicForMatch(kv.Key);
            if (norm.Contains(normKey) || normKey.Contains(norm))
                return (kv.Value.noorText, kv.Value.noorValue);
        }

        // 4. fallback: "أخرى" — مطابق لـ return map['أخرى'] في noorMatchPositive_
        foreach (var kv in map)
        {
            if (kv.Key.Contains("أخرى"))
                return (kv.Value.noorText, kv.Value.noorValue);
        }

        return (null, null);
    }

    /// <summary>توحيد صيغة التاريخ الهجري للمقارنة</summary>
    public static string NormalizeHijriDate(string dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return "";
        var s = dateStr.Trim();
        // إزالة لاحقة "هـ" والأحرف غير المرئية
        s = System.Text.RegularExpressions.Regex.Replace(s, @"[\u200F\u200E\u061C\u200B\u200C\u200D\uFEFF]", "");
        s = System.Text.RegularExpressions.Regex.Replace(s, @"\s*هـ\s*$", "").Trim();
        // تحويل الأرقام العربية إلى غربية
        s = ArabicToWesternNumerals(s);
        // إزالة الأصفار البادئة من كل جزء
        s = System.Text.RegularExpressions.Regex.Replace(s, @"\b0+(\d)", "$1");

        // توحيد الترتيب: إذا كان dd/mm/yyyy → تحويل إلى yyyy/mm/dd
        var parts = s.Split('/');
        if (parts.Length == 3)
        {
            if (int.TryParse(parts[0], out var first) && int.TryParse(parts[2], out var last))
            {
                if (last >= 1300 && last <= 1500 && first <= 30)
                    s = parts[2] + "/" + parts[1] + "/" + parts[0];
            }
        }
        return s;
    }

    /// <summary>تحويل الأرقام العربية إلى غربية</summary>
    public static string ArabicToWesternNumerals(string str)
    {
        if (string.IsNullOrEmpty(str)) return str ?? "";
        var map = new Dictionary<char, char>
        {
            {'٠','0'},{'١','1'},{'٢','2'},{'٣','3'},{'٤','4'},
            {'٥','5'},{'٦','6'},{'٧','7'},{'٨','8'},{'٩','9'}
        };
        var result = new char[str.Length];
        for (int i = 0; i < str.Length; i++)
            result[i] = map.ContainsKey(str[i]) ? map[str[i]] : str[i];
        var s = new string(result);
        s = s.Replace("هـ", "")
             .Replace("\u200e", "").Replace("\u200f", "").Replace("\u200b", "")
             .Replace("\u200c", "").Replace("\u200d", "")
             .Replace("\u2066", "").Replace("\u2067", "").Replace("\u2068", "")
             .Replace("\u2069", "").Replace("\u061c", "");
        return s.Trim();
    }
}
