using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
public class PermissionsController : RecordControllerBase
{
    public PermissionsController(AppDbContext db, IWhatsAppServerService wa, IHijriDateService hijri, ISemesterService semesterSvc, IMemoryCache cache)
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
        [FromQuery] bool? isSent = null,
        [FromQuery] string? search = null)
    {
        var query = ApplyCommonFilters(
            Db.PermissionRecords.AsQueryable(),
            stage, grade, className, studentId, dateFrom, dateTo, isSent, search);

        // Entity-specific filter
        if (!string.IsNullOrEmpty(hijriDate))
            query = query.Where(r => r.HijriDate == hijriDate);

        var records = await query
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.Mobile, r.ExitTime, r.Reason,
                r.Receiver, r.Supervisor, r.HijriDate,
                r.RecordedBy, r.RecordedAt,
                r.ConfirmationTime, r.IsSent
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(records.Cast<object>().ToList()));
    }

    // إحصائيات اليوم
    [HttpGet("daily-stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetDailyStats([FromQuery] string? stage = null)
    {
        var today = DateTime.UtcNow.Date;
        var query = ApplyStageFilter(Db.PermissionRecords.Where(r => r.RecordedAt >= today), stage);

        var todayRecords = await query.ToListAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            todayCount = todayRecords.Count,
            sentCount = todayRecords.Count(r => r.IsSent),
            unsentCount = todayRecords.Count(r => !r.IsSent),
            confirmedCount = todayRecords.Count(r => !string.IsNullOrEmpty(r.ConfirmationTime)),
            pendingCount = todayRecords.Count(r => string.IsNullOrEmpty(r.ConfirmationTime)),
        }));
    }

    // الاستئذانات المعلقة (للحارس)
    // ← مطابق لـ getPendingPermissions(stage) في Server_Attendance.gs سطر 491
    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetPending([FromQuery] string? stage = null)
    {
        var today = DateTime.UtcNow.Date;
        var query = ApplyStageFilter(
            Db.PermissionRecords
                .Where(r => r.RecordedAt >= today && (r.ConfirmationTime == null || r.ConfirmationTime == "")),
            stage);

        var records = await query
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.Mobile, r.ExitTime, r.Reason,
                r.Receiver, r.Supervisor, r.HijriDate,
                r.RecordedBy, r.RecordedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(records.Cast<object>().ToList()));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse>> Add([FromBody] PermissionRequest request)
    {
        if (request.StudentId <= 0)
            return Ok(ApiResponse.Fail("الطالب مطلوب"));

        var student = await Db.Students.FindAsync(request.StudentId);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
            hijriDate = Hijri.GetHijriDate();

        var record = new PermissionRecord
        {
            StudentId = request.StudentId,
            StudentNumber = student.StudentNumber,
            StudentName = student.Name,
            Grade = student.Grade,
            Class = student.Class,
            Stage = student.Stage,
            Mobile = student.Mobile,
            ExitTime = request.ExitTime ?? TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Riyadh")).ToString("HH:mm"),
            Reason = request.Reason ?? "",
            Receiver = request.Receiver ?? "",
            Supervisor = request.Supervisor ?? "",
            HijriDate = hijriDate,
            RecordedBy = request.RecordedBy ?? "",
            RecordedAt = DateTime.UtcNow
        };

        await StampSemesterAsync(record);
        Db.PermissionRecords.Add(record);
        await Db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = record.Id, message = "تم تسجيل الاستئذان بنجاح" }));
    }

    // حفظ جماعي
    [HttpPost("batch")]
    public async Task<ActionResult<ApiResponse<object>>> AddBatch([FromBody] PermissionBatchRequest request)
    {
        if (request.StudentIds == null || request.StudentIds.Count == 0)
            return Ok(ApiResponse<object>.Fail("لا يوجد طلاب محددين"));

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
            hijriDate = Hijri.GetHijriDate();

        var students = await Db.Students.Where(s => request.StudentIds.Contains(s.Id)).ToListAsync();
        var added = 0;

        foreach (var student in students)
        {
            var batchRecord = new PermissionRecord
            {
                StudentId = student.Id,
                StudentNumber = student.StudentNumber,
                StudentName = student.Name,
                Grade = student.Grade,
                Class = student.Class,
                Stage = student.Stage,
                Mobile = student.Mobile,
                ExitTime = request.ExitTime ?? TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Riyadh")).ToString("HH:mm"),
                Reason = request.Reason ?? "",
                Receiver = request.Receiver ?? "",
                Supervisor = request.Supervisor ?? "",
                HijriDate = hijriDate,
                RecordedBy = request.RecordedBy ?? "",
                RecordedAt = DateTime.UtcNow
            };
            await StampSemesterAsync(batchRecord);
            Db.PermissionRecords.Add(batchRecord);
            added++;
        }

        await Db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { addedCount = added, message = $"تم تسجيل {added} حالة استئذان" }));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse>> Update(int id, [FromBody] PermissionUpdateRequest request)
    {
        var record = await Db.PermissionRecords.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail("السجل غير موجود"));

        if (request.ConfirmationTime != null)
            record.ConfirmationTime = request.ConfirmationTime;
        if (request.Reason != null)
            record.Reason = request.Reason;
        if (request.Receiver != null)
            record.Receiver = request.Receiver;
        if (request.Supervisor != null)
            record.Supervisor = request.Supervisor;

        await Db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث السجل بنجاح"));
    }

    // تأكيد خروج الطالب (الحارس)
    [HttpPut("{id}/confirm")]
    public async Task<ActionResult<ApiResponse>> ConfirmExit(int id)
    {
        var record = await Db.PermissionRecords.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail("السجل غير موجود"));

        record.ConfirmationTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Riyadh")).ToString("HH:mm");
        await Db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تأكيد الخروج"));
    }

    // تحديث حالة الإرسال
    [HttpPut("{id}/sent")]
    public async Task<ActionResult<ApiResponse>> UpdateSentStatus(int id, [FromBody] CommonUpdateSentRequest request)
    {
        return await UpdateSentStatusAsync(Db.PermissionRecords, id, request.IsSent);
    }

    // تحديث حالة الإرسال - جماعي
    [HttpPut("sent-batch")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSentStatusBatch([FromBody] CommonBulkIdsRequest request)
    {
        return await UpdateSentBatchAsync(Db.PermissionRecords, request.Ids);
    }

    // إرسال واتساب
    [HttpPost("{id}/send-whatsapp")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsApp(int id, [FromBody] SendPermWhatsAppRequest request)
    {
        var record = await Db.PermissionRecords.FindAsync(id);
        if (record == null) return Ok(ApiResponse<object>.Fail("السجل غير موجود"));

        var message = request.Message ?? $"المكرم ولي أمر الطالب / {record.StudentName}\nالسلام عليكم\nنود إبلاغكم باستئذان ابنكم للخروج من المدرسة\nالسبب: {record.Reason}\nوقت الخروج: {record.ExitTime}\nالمستلم: {record.Receiver}\nالتاريخ: {record.HijriDate}\nنأمل التواصل مع المدرسة.";

        return await SendWhatsAppSingleAsync(
            record, record.Mobile, message,
            request.SenderPhone,
            "استئذان",
            "استئذان خروج",
            request.SentBy ?? "");
    }

    // إرسال جماعي
    [HttpPost("send-whatsapp-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsAppBulk([FromBody] CommonBulkSendWhatsAppRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            return Ok(ApiResponse<object>.Fail("لا توجد سجلات محددة"));

        var records = await Db.PermissionRecords.Where(r => request.Ids.Contains(r.Id)).ToListAsync();

        var (sentCount, failedCount, total) = await SendWhatsAppBulkCoreAsync(
            records,
            r => r.Mobile,
            r => Task.FromResult($"المكرم ولي أمر الطالب / {r.StudentName}\nالسلام عليكم\nنود إبلاغكم باستئذان ابنكم للخروج من المدرسة\nالسبب: {r.Reason}\nوقت الخروج: {r.ExitTime}\nالتاريخ: {r.HijriDate}"),
            request.SenderPhone,
            "استئذان",
            _ => "استئذان خروج",
            request.SentBy ?? "",
            speed: request.Speed,
            customDelaySeconds: request.CustomDelaySeconds);

        return Ok(ApiResponse<object>.Ok(new { sentCount, failedCount, total }));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        return await DeleteRecordAsync(Db.PermissionRecords, id);
    }

    [HttpPost("delete-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteBulk([FromBody] CommonBulkIdsRequest request)
    {
        return await DeleteBulkAsync(Db.PermissionRecords, request.Ids);
    }

    [HttpGet("student-count/{studentId}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentCount(int studentId)
    {
        var count = await Db.PermissionRecords.CountAsync(r => r.StudentId == studentId);
        return Ok(ApiResponse<object>.Ok(new { total = count }));
    }

    // تقرير
    [HttpGet("report")]
    public async Task<ActionResult<ApiResponse<object>>> GetReport([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.PermissionRecords.AsQueryable(), stage);

        var records = await query.ToListAsync();

        var topStudents = records.GroupBy(r => new { r.StudentId, r.StudentName, r.Grade, r.Class })
            .Select(g => new { g.Key.StudentId, g.Key.StudentName, g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10).ToList();

        var byClass = records.GroupBy(r => new { r.Grade, r.Class })
            .Select(g => new { g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count).ToList();

        var byReason = records.GroupBy(r => string.IsNullOrEmpty(r.Reason) ? "غير محدد" : r.Reason)
            .Select(g => new { reason = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).ToList();

        return Ok(ApiResponse<object>.Ok(new { total = records.Count, topStudents, byClass, byReason }));
    }

    // تصدير CSV
    [HttpGet("export")]
    public async Task<ActionResult> ExportCsv([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.PermissionRecords.AsQueryable(), stage);

        var records = await query.OrderByDescending(r => r.RecordedAt).ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("رقم الطالب,اسم الطالب,الصف,الفصل,وقت الخروج,السبب,المستلم,التاريخ,التأكيد,تم الإرسال");
        foreach (var r in records)
        {
            sb.AppendLine($"\"{r.StudentNumber}\",\"{r.StudentName}\",\"{r.Grade}\",\"{r.Class}\",\"{r.ExitTime}\",\"{r.Reason}\",\"{r.Receiver}\",\"{r.HijriDate}\",\"{r.ConfirmationTime}\",{(r.IsSent ? "نعم" : "لا")}");
        }
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "permissions.csv");
    }
}

// ===== Request DTOs =====
public class PermissionRequest
{
    public int StudentId { get; set; }
    public string? ExitTime { get; set; }
    public string? Reason { get; set; }
    public string? Receiver { get; set; }
    public string? Supervisor { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class PermissionBatchRequest
{
    public List<int> StudentIds { get; set; } = new();
    public string? ExitTime { get; set; }
    public string? Reason { get; set; }
    public string? Receiver { get; set; }
    public string? Supervisor { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class PermissionUpdateRequest
{
    public string? ConfirmationTime { get; set; }
    public string? Reason { get; set; }
    public string? Receiver { get; set; }
    public string? Supervisor { get; set; }
}

public class SendPermWhatsAppRequest
{
    public string? SenderPhone { get; set; }
    public string? Message { get; set; }
    public string? SentBy { get; set; }
}
