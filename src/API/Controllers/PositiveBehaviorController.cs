using Microsoft.AspNetCore.Authorization;
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
public class PositiveBehaviorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHijriDateService _hijri;
    private readonly ISemesterService _semesterSvc;

    public PositiveBehaviorController(AppDbContext db, IHijriDateService hijri, ISemesterService semesterSvc)
    {
        _db = db;
        _hijri = hijri;
        _semesterSvc = semesterSvc;
    }

    // ─── GET ALL with filters ───
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetAll(
        [FromQuery] string? stage = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? className = null,
        [FromQuery] int? studentId = null,
        [FromQuery] string? search = null)
    {
        var query = _db.PositiveBehaviors.AsQueryable();

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
        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => r.StudentName.Contains(search) || r.StudentNumber.Contains(search));

        var records = await query
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.BehaviorType, r.Degree, r.Details, r.HijriDate,
                r.RecordedBy, r.RecordedAt, r.IsSent
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(records.Cast<object>().ToList()));
    }

    // ─── DAILY STATS ───
    [HttpGet("daily-stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetDailyStats([FromQuery] string? stage = null)
    {
        var query = _db.PositiveBehaviors.AsQueryable();
        // ★ فرض عزل المراحل
        var effectiveStage2 = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage2) && Enum.TryParse<Stage>(effectiveStage2, true, out var stageEnum))
            query = query.Where(r => r.Stage == stageEnum);

        var today = DateTime.UtcNow.Date;
        var totalRecords = await query.CountAsync();
        var todayCount = await query.CountAsync(r => r.RecordedAt >= today);
        var uniqueStudents = await query.Select(r => r.StudentId).Distinct().CountAsync();

        // Degree مخزّن كـ string — نجمع في الذاكرة فقط القيم (أخف من تحميل كل الأعمدة)
        var degrees = await query.Select(r => r.Degree).ToListAsync();
        double totalDegrees = 0;
        foreach (var d in degrees)
        {
            if (double.TryParse(d, out var deg))
                totalDegrees += deg;
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            totalRecords,
            todayCount,
            uniqueStudents,
            totalDegrees
        }));
    }

    // ─── ADD (single) ───
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Add([FromBody] PositiveBehaviorRequest request)
    {
        if (request.StudentId <= 0)
            return Ok(ApiResponse.Fail("الطالب مطلوب"));
        if (string.IsNullOrEmpty(request.BehaviorType))
            return Ok(ApiResponse.Fail("نوع السلوك مطلوب"));

        var student = await _db.Students.FindAsync(request.StudentId);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
        {
            hijriDate = _hijri.GetHijriDate();
        }

        var record = new PositiveBehavior
        {
            StudentId = request.StudentId,
            StudentNumber = student.StudentNumber,
            StudentName = student.Name,
            Grade = student.Grade,
            Class = student.Class,
            Stage = student.Stage,
            BehaviorType = request.BehaviorType,
            Degree = request.Degree ?? "",
            Details = request.Details ?? "",
            HijriDate = hijriDate,
            RecordedBy = request.RecordedBy ?? "الوكيل",
            RecordedAt = DateTime.UtcNow
        };

        var (sem, yr) = await _semesterSvc.GetCurrentAsync();
        record.Semester = sem;
        record.AcademicYear = yr;
        _db.PositiveBehaviors.Add(record);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = record.Id, message = "تم تسجيل السلوك الإيجابي بنجاح" }));
    }

    // ─── BATCH ADD ───
    [HttpPost("batch")]
    public async Task<ActionResult<ApiResponse<object>>> AddBatch([FromBody] PosBehaviorBatchRequest request)
    {
        if (request.StudentIds == null || request.StudentIds.Count == 0)
            return Ok(ApiResponse.Fail("لم يتم اختيار طلاب"));
        if (string.IsNullOrEmpty(request.BehaviorType))
            return Ok(ApiResponse.Fail("نوع السلوك مطلوب"));

        var students = await _db.Students
            .Where(s => request.StudentIds.Contains(s.Id))
            .ToListAsync();

        var hijriDate = request.HijriDate ?? _hijri.GetHijriDate();

        var (sem, yr) = await _semesterSvc.GetCurrentAsync();
        var records = new List<PositiveBehavior>();
        foreach (var s in students)
        {
            var pb = new PositiveBehavior
            {
                StudentId = s.Id,
                StudentNumber = s.StudentNumber,
                StudentName = s.Name,
                Grade = s.Grade,
                Class = s.Class,
                Stage = s.Stage,
                BehaviorType = request.BehaviorType,
                Degree = request.Degree ?? "",
                Details = request.Details ?? "",
                HijriDate = hijriDate,
                RecordedBy = request.RecordedBy ?? "الوكيل",
                RecordedAt = DateTime.UtcNow
            };
            pb.Semester = sem;
            pb.AcademicYear = yr;
            records.Add(pb);
        }

        _db.PositiveBehaviors.AddRange(records);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { message = $"تم حفظ {records.Count} سجل بنجاح", count = records.Count }));
    }

    // ─── UPDATE ───
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse>> Update(int id, [FromBody] PositiveBehaviorRequest request)
    {
        var record = await _db.PositiveBehaviors.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail("السجل غير موجود"));

        if (!string.IsNullOrEmpty(request.BehaviorType))
            record.BehaviorType = request.BehaviorType;
        if (request.Degree != null)
            record.Degree = request.Degree;
        if (!string.IsNullOrEmpty(request.Details))
            record.Details = request.Details;
        if (request.HijriDate != null)
            record.HijriDate = request.HijriDate;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث السجل بنجاح"));
    }

    // ─── DELETE ───
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var record = await _db.PositiveBehaviors.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail("السجل غير موجود"));

        _db.PositiveBehaviors.Remove(record);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم حذف السجل بنجاح"));
    }

    // ─── BULK DELETE ───
    [HttpPost("delete-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteBulk([FromBody] CommonBulkIdsRequest request)
    {
        var records = await _db.PositiveBehaviors
            .Where(r => request.Ids.Contains(r.Id))
            .ToListAsync();

        _db.PositiveBehaviors.RemoveRange(records);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { deleted = records.Count }));
    }

    // ─── STUDENT SUMMARY ───
    [HttpGet("student-summary/{studentId}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentSummary(int studentId)
    {
        var records = await _db.PositiveBehaviors
            .Where(r => r.StudentId == studentId)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync();

        var summary = new
        {
            total = records.Count,
            byType = records.GroupBy(r => r.BehaviorType)
                .Select(g => new { type = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToList(),
            recent = records.Take(10)
                .Select(r => new { r.Id, r.BehaviorType, r.Details, r.HijriDate, r.RecordedAt, r.RecordedBy })
                .ToList()
        };

        return Ok(ApiResponse<object>.Ok(summary));
    }

    // ─── REPORT ───
    [HttpGet("report")]
    public async Task<ActionResult<ApiResponse<object>>> GetReport([FromQuery] string? stage = null)
    {
        var query = _db.PositiveBehaviors.AsQueryable();
        // ★ فرض عزل المراحل
        var effectiveStage3 = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage3) && Enum.TryParse<Stage>(effectiveStage3, true, out var stageEnum))
            query = query.Where(r => r.Stage == stageEnum);

        var topStudents = await query
            .GroupBy(r => new { r.StudentId, r.StudentName, r.Grade, r.Class })
            .Select(g => new { g.Key.StudentId, g.Key.StudentName, grade = g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToListAsync();

        var byClass = await query
            .GroupBy(r => r.Grade + " " + r.Class)
            .Select(g => new { className = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var byType = await query
            .GroupBy(r => r.BehaviorType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var total = await query.CountAsync();
        var uniqueStudents = await query.Select(r => r.StudentId).Distinct().CountAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            total,
            uniqueStudents,
            topStudents,
            byClass,
            byType
        }));
    }

    // ─── COMPENSATION (saveCompensationRecord) ───
    [HttpPost("compensation")]
    public async Task<ActionResult<ApiResponse<object>>> SaveCompensation([FromBody] CompensationRequest request)
    {
        if (request.StudentId <= 0)
            return Ok(ApiResponse.Fail("الطالب مطلوب"));
        if (string.IsNullOrEmpty(request.BehaviorText))
            return Ok(ApiResponse.Fail("نص السلوك التعويضي مطلوب"));

        var student = await _db.Students.FindAsync(request.StudentId);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        // التحقق من المخالفة المرتبطة
        if (request.ViolationId.HasValue)
        {
            var violation = await _db.Violations.FindAsync(request.ViolationId.Value);
            if (violation == null)
                return Ok(ApiResponse.Fail("المخالفة المرتبطة غير موجودة"));
        }

        var hijriDate = _hijri.GetHijriDate();

        // بناء نص السلوك مع ربط المخالفة
        var behaviorNote = request.BehaviorText + " (فرص تعويض)";
        if (!string.IsNullOrEmpty(request.ViolationCode))
            behaviorNote += $" [مخالفة:{request.ViolationCode}]";

        var record = new PositiveBehavior
        {
            StudentId = student.Id,
            StudentNumber = student.StudentNumber,
            StudentName = student.Name,
            Grade = student.Grade,
            Class = student.Class,
            Stage = student.Stage,
            BehaviorType = behaviorNote,
            Degree = "تعويض",
            Details = request.NoorValue ?? "",
            HijriDate = hijriDate,
            RecordedBy = "الوكيل",
            RecordedAt = DateTime.UtcNow,
            LinkedViolationId = request.ViolationId
        };

        var (sem3, yr3) = await _semesterSvc.GetCurrentAsync();
        record.Semester = sem3;
        record.AcademicYear = yr3;
        _db.PositiveBehaviors.Add(record);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            message = "تم حفظ التعويض بنجاح",
            studentName = student.Name,
            behavior = request.BehaviorText
        }));
    }

    // ─── EXPORT CSV ───
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv([FromQuery] string? stage = null)
    {
        var query = _db.PositiveBehaviors.AsQueryable();
        // ★ فرض عزل المراحل
        var effectiveStage4 = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage4) && Enum.TryParse<Stage>(effectiveStage4, true, out var stageEnum))
            query = query.Where(r => r.Stage == stageEnum);

        var records = await query.OrderByDescending(r => r.RecordedAt).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("رقم الطالب,اسم الطالب,الصف,الفصل,السلوك المتمايز,الدرجة,التفاصيل,المعلم,التاريخ الهجري");

        foreach (var r in records)
        {
            sb.AppendLine($"\"{r.StudentNumber}\",\"{r.StudentName}\",\"{r.Grade}\",\"{r.Class}\",\"{r.BehaviorType}\",\"{r.Degree}\",\"{r.Details}\",\"{r.RecordedBy}\",\"{r.HijriDate}\"");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "positive_behavior.csv");
    }

    /// <summary>
    /// ★ عزل المراحل — الوكيل يرى مرحلته فقط
    /// </summary>
    private string? EnforceScopeStage(string? requestedStage)
    {
        var scopeType = User.FindFirst("scope_type")?.Value;
        var scopeValue = User.FindFirst("scope_value")?.Value;
        if (string.IsNullOrEmpty(scopeType) || scopeType == "all") return requestedStage;
        if (scopeType == "stage" && !string.IsNullOrEmpty(scopeValue)) return scopeValue;
        return requestedStage;
    }
}

// ─── DTOs ───
public class PositiveBehaviorRequest
{
    public int StudentId { get; set; }
    public string? BehaviorType { get; set; }
    public string? Degree { get; set; }
    public string? Details { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class PosBehaviorBatchRequest
{
    public List<int> StudentIds { get; set; } = new();
    public string? BehaviorType { get; set; }
    public string? Degree { get; set; }
    public string? Details { get; set; }
    public string? HijriDate { get; set; }
    public string? RecordedBy { get; set; }
}

public class CompensationRequest
{
    public int StudentId { get; set; }
    public string? BehaviorText { get; set; }
    public string? NoorValue { get; set; }
    public int? ViolationId { get; set; }
    public string? ViolationCode { get; set; }
}
