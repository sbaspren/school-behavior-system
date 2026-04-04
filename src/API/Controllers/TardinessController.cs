using Microsoft.AspNetCore.Authorization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.API.Controllers.Base;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TardinessController : RecordControllerBase
{
    public TardinessController(AppDbContext db, IWhatsAppServerService wa, IHijriDateService hijri, ISemesterService semesterSvc, IMemoryCache cache)
        : base(db, wa, hijri, semesterSvc, cache) { }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetAll(
        [FromQuery] string? stage = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? className = null,
        [FromQuery] int? studentId = null,
        [FromQuery] string? hijriDate = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] string? tardinessType = null,
        [FromQuery] bool? isSent = null,
        [FromQuery] string? search = null)
    {
        var query = ApplyCommonFilters(
            Db.TardinessRecords.AsQueryable(),
            stage, grade, className, studentId, dateFrom, dateTo, isSent, search);

        // Entity-specific filters
        if (!string.IsNullOrEmpty(hijriDate))
            query = query.Where(r => r.HijriDate == hijriDate);
        if (!string.IsNullOrEmpty(tardinessType) && Enum.TryParse<TardinessType>(tardinessType, true, out var tt))
            query = query.Where(r => r.TardinessType == tt);

        var records = await query
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.Mobile,
                tardinessType = r.TardinessType.ToString(),
                r.Period, r.HijriDate,
                r.RecordedBy, r.RecordedAt, r.IsSent
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(records.Cast<object>().ToList()));
    }

    // إحصائيات اليوم
    [HttpGet("daily-stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetDailyStats([FromQuery] string? stage = null)
    {
        var today = DateTime.UtcNow.Date;
        var query = ApplyStageFilter(Db.TardinessRecords.Where(r => r.RecordedAt >= today), stage);

        var todayRecords = await query.ToListAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            todayCount = todayRecords.Count,
            sentCount = todayRecords.Count(r => r.IsSent),
            unsentCount = todayRecords.Count(r => !r.IsSent),
            morningCount = todayRecords.Count(r => r.TardinessType == TardinessType.Morning),
            periodCount = todayRecords.Count(r => r.TardinessType == TardinessType.Period),
        }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse>> Add([FromBody] TardinessRequest request)
    {
        if (request.StudentId <= 0)
            return Ok(ApiResponse.Fail("الطالب مطلوب"));

        var student = await Db.Students.FindAsync(request.StudentId);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        if (!Enum.TryParse<TardinessType>(request.TardinessType, true, out var tardinessType))
            tardinessType = TardinessType.Morning;

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
            hijriDate = Hijri.GetHijriDate();

        var record = new TardinessRecord
        {
            StudentId = request.StudentId,
            StudentNumber = student.StudentNumber,
            StudentName = student.Name,
            Grade = student.Grade,
            Class = student.Class,
            Stage = student.Stage,
            Mobile = student.Mobile,
            TardinessType = tardinessType,
            Period = request.Period ?? "",
            HijriDate = hijriDate,
            RecordedBy = request.RecordedBy ?? "",
            RecordedAt = DateTime.UtcNow
        };

        await StampSemesterAsync(record);
        Db.TardinessRecords.Add(record);
        await Db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = record.Id, message = "تم تسجيل التأخر بنجاح" }));
    }

    // حفظ جماعي (عدة طلاب دفعة واحدة)
    [HttpPost("batch")]
    public async Task<ActionResult<ApiResponse<object>>> AddBatch([FromBody] TardinessBatchRequest request)
    {
        if (request.StudentIds == null || request.StudentIds.Count == 0)
            return Ok(ApiResponse<object>.Fail("لا يوجد طلاب محددين"));

        if (!Enum.TryParse<TardinessType>(request.TardinessType, true, out var tardinessType))
            tardinessType = TardinessType.Morning;

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
            hijriDate = Hijri.GetHijriDate();

        var students = await Db.Students.Where(s => request.StudentIds.Contains(s.Id)).ToListAsync();
        var added = 0;

        foreach (var student in students)
        {
            var batchRecord = new TardinessRecord
            {
                StudentId = student.Id,
                StudentNumber = student.StudentNumber,
                StudentName = student.Name,
                Grade = student.Grade,
                Class = student.Class,
                Stage = student.Stage,
                Mobile = student.Mobile,
                TardinessType = tardinessType,
                Period = request.Period ?? "",
                HijriDate = hijriDate,
                RecordedBy = request.RecordedBy ?? "",
                RecordedAt = DateTime.UtcNow
            };
            await StampSemesterAsync(batchRecord);
            Db.TardinessRecords.Add(batchRecord);
            added++;
        }

        await Db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { addedCount = added, message = $"تم تسجيل {added} حالة تأخر" }));
    }

    // تحديث حالة الإرسال
    [HttpPut("{id}/sent")]
    public async Task<ActionResult<ApiResponse>> UpdateSentStatus(int id, [FromBody] CommonUpdateSentRequest request)
    {
        return await UpdateSentStatusAsync(Db.TardinessRecords, id, request.IsSent);
    }

    // تحديث حالة الإرسال - جماعي
    [HttpPut("sent-batch")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSentStatusBatch([FromBody] CommonBulkIdsRequest request)
    {
        return await UpdateSentBatchAsync(Db.TardinessRecords, request.Ids);
    }

    // إرسال واتساب
    [HttpPost("{id}/send-whatsapp")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsApp(int id, [FromBody] SendTardinessWhatsAppRequest request)
    {
        var record = await Db.TardinessRecords.FindAsync(id);
        if (record == null) return Ok(ApiResponse<object>.Fail("السجل غير موجود"));

        var typeLabel = record.TardinessType == TardinessType.Morning ? "تأخر صباحي" : "تأخر عن الحصة";
        var message = request.Message ?? $"المكرم ولي أمر الطالب / {record.StudentName}\nالسلام عليكم\nنود إبلاغكم بتسجيل {typeLabel} على ابنكم بتاريخ {record.HijriDate}\nنأمل التواصل مع المدرسة.";

        return await SendWhatsAppSingleAsync(
            record, record.Mobile, message,
            request.SenderPhone,
            "تأخر",
            typeLabel,
            request.SentBy ?? "");
    }

    // إرسال جماعي
    [HttpPost("send-whatsapp-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsAppBulk([FromBody] CommonBulkSendWhatsAppRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            return Ok(ApiResponse<object>.Fail("لا توجد سجلات محددة"));

        var records = await Db.TardinessRecords.Where(r => request.Ids.Contains(r.Id)).ToListAsync();

        var (sentCount, failedCount, total) = await SendWhatsAppBulkCoreAsync(
            records,
            r => r.Mobile,
            r =>
            {
                var typeLabel = r.TardinessType == TardinessType.Morning ? "تأخر صباحي" : "تأخر عن الحصة";
                return Task.FromResult($"المكرم ولي أمر الطالب / {r.StudentName}\nالسلام عليكم\nنود إبلاغكم بتسجيل {typeLabel} على ابنكم بتاريخ {r.HijriDate}\nنأمل التواصل مع المدرسة.");
            },
            request.SenderPhone,
            "تأخر",
            r => r.TardinessType == TardinessType.Morning ? "تأخر صباحي" : "تأخر عن الحصة",
            request.SentBy ?? "",
            speed: request.Speed,
            customDelaySeconds: request.CustomDelaySeconds);

        return Ok(ApiResponse<object>.Ok(new { sentCount, failedCount, total }));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        return await DeleteRecordAsync(Db.TardinessRecords, id);
    }

    // حذف جماعي
    [HttpPost("delete-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteBulk([FromBody] CommonBulkIdsRequest request)
    {
        return await DeleteBulkAsync(Db.TardinessRecords, request.Ids);
    }

    [HttpGet("student-count/{studentId}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentCount(int studentId)
    {
        var counts = await Db.TardinessRecords
            .Where(r => r.StudentId == studentId)
            .GroupBy(r => r.TardinessType)
            .Select(g => new { type = g.Key.ToString(), count = g.Count() })
            .ToListAsync();
        var total = counts.Sum(c => c.count);
        return Ok(ApiResponse<object>.Ok(new { total, byType = counts }));
    }

    // تقرير إحصائي
    [HttpGet("report")]
    public async Task<ActionResult<ApiResponse<object>>> GetReport([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.TardinessRecords.AsQueryable(), stage);

        var records = await query.ToListAsync();

        var topStudents = records.GroupBy(r => new { r.StudentId, r.StudentName, r.Grade, r.Class })
            .Select(g => new { g.Key.StudentId, g.Key.StudentName, g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10).ToList();

        var byClass = records.GroupBy(r => new { r.Grade, r.Class })
            .Select(g => new { g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count).ToList();

        var byType = new
        {
            morning = records.Count(r => r.TardinessType == TardinessType.Morning),
            period = records.Count(r => r.TardinessType == TardinessType.Period),
            assembly = records.Count(r => r.TardinessType == TardinessType.Assembly),
        };

        return Ok(ApiResponse<object>.Ok(new { total = records.Count, topStudents, byClass, byType }));
    }

    // تصدير CSV
    [HttpGet("export")]
    public async Task<ActionResult> ExportCsv([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.TardinessRecords.AsQueryable(), stage);

        var records = await query.OrderByDescending(r => r.RecordedAt).ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("رقم الطالب,اسم الطالب,الصف,الفصل,نوع التأخر,الحصة,التاريخ,تم الإرسال");
        foreach (var r in records)
        {
            var typeLabel = r.TardinessType == TardinessType.Morning ? "صباحي" : r.TardinessType == TardinessType.Period ? "حصة" : "اصطفاف";
            sb.AppendLine($"\"{r.StudentNumber}\",\"{r.StudentName}\",\"{r.Grade}\",\"{r.Class}\",\"{typeLabel}\",\"{r.Period}\",\"{r.HijriDate}\",{(r.IsSent ? "نعم" : "لا")}");
        }
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "tardiness.csv");
    }
}

// ===== Request DTOs =====
public class TardinessRequest
{
    public int StudentId { get; set; }
    public string? TardinessType { get; set; }
    public string? Period { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class TardinessBatchRequest
{
    public List<int> StudentIds { get; set; } = new();
    public string? TardinessType { get; set; }
    public string? Period { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class SendTardinessWhatsAppRequest
{
    public string? SenderPhone { get; set; }
    public string? Message { get; set; }
    public string? SentBy { get; set; }
}
