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
public class EducationalNotesController : RecordControllerBase
{
    public EducationalNotesController(AppDbContext db, IWhatsAppServerService whatsApp, IHijriDateService hijri, ISemesterService semesterSvc, IMemoryCache cache)
        : base(db, whatsApp, hijri, semesterSvc, cache) { }

    // ─── GET ALL with filters ───
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetAll(
        [FromQuery] string? stage = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? className = null,
        [FromQuery] int? studentId = null,
        [FromQuery] string? noteType = null,
        [FromQuery] string? hijriDate = null,
        [FromQuery] bool? isSent = null,
        [FromQuery] string? search = null)
    {
        var query = ApplyCommonFilters(
            Db.EducationalNotes.AsQueryable(),
            stage, grade, className, studentId, isSent: isSent);

        // Entity-specific filters
        if (!string.IsNullOrEmpty(noteType))
            query = query.Where(r => r.NoteType == noteType);
        if (!string.IsNullOrEmpty(hijriDate))
            query = query.Where(r => r.HijriDate == hijriDate);
        // Search includes TeacherName (entity-specific), so applied separately
        if (!string.IsNullOrEmpty(search))
            query = query.Where(r => r.StudentName.Contains(search) || r.StudentNumber.Contains(search) || r.TeacherName.Contains(search));

        var records = await query
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.Mobile, r.NoteType, r.Details,
                r.TeacherName, r.HijriDate,
                r.RecordedAt, r.IsSent
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(records.Cast<object>().ToList()));
    }

    // ─── DAILY STATS — مطابق لـ getEducationalNotesStats + getTodayEducationalNotesRecords ───
    [HttpGet("daily-stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetDailyStats([FromQuery] string? stage = null)
    {
        var baseQuery = ApplyStageFilter(Db.EducationalNotes.AsQueryable(), stage);

        // إحصائيات مجمّعة على مستوى قاعدة البيانات (بدون تحميل كامل الجدول)
        var total = await baseQuery.CountAsync();
        var sent = await baseQuery.CountAsync(r => r.IsSent);
        var notSent = total - sent;

        var byType = await baseQuery
            .GroupBy(r => r.NoteType == null || r.NoteType == "" ? "غير محدد" : r.NoteType)
            .Select(g => new { key = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.key, x => x.count);

        var byGrade = await baseQuery
            .GroupBy(r => r.Grade == null || r.Grade == "" ? "غير محدد" : r.Grade)
            .Select(g => new { key = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.key, x => x.count);

        // سجلات اليوم فقط
        var today = DateTime.UtcNow.Date;
        var todayQuery = baseQuery.Where(r => r.RecordedAt >= today);
        var todayCount = await todayQuery.CountAsync();

        var todayList = await todayQuery
            .OrderByDescending(r => r.RecordedAt)
            .Select(r => new
            {
                r.Id, r.StudentId, r.StudentNumber, r.StudentName,
                r.Grade, className = r.Class,
                stage = r.Stage.ToString(),
                r.Mobile, r.NoteType, r.Details,
                r.TeacherName, r.HijriDate,
                r.RecordedAt, r.IsSent
            }).ToListAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            totalCount = total,
            sentCount = sent,
            unsentCount = notSent,
            byType,
            byGrade,
            todayCount,
            today = todayList
        }));
    }

    // ─── ADD (single) ───
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Add([FromBody] EducationalNoteRequest request)
    {
        if (request.StudentId <= 0)
            return Ok(ApiResponse.Fail("الطالب مطلوب"));
        if (string.IsNullOrEmpty(request.NoteType))
            return Ok(ApiResponse.Fail("نوع الملاحظة مطلوب"));

        var student = await Db.Students.FindAsync(request.StudentId);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        var hijriDate = request.HijriDate;
        if (string.IsNullOrEmpty(hijriDate))
            hijriDate = Hijri.GetHijriDate();

        var record = new EducationalNote
        {
            StudentId = request.StudentId,
            StudentNumber = student.StudentNumber,
            StudentName = student.Name,
            Grade = student.Grade,
            Class = student.Class,
            Stage = student.Stage,
            Mobile = student.Mobile,
            NoteType = request.NoteType,
            Details = request.Details ?? "",
            TeacherName = request.TeacherName ?? "الوكيل",
            HijriDate = hijriDate,
            RecordedAt = DateTime.UtcNow
        };

        await StampSemesterAsync(record);
        Db.EducationalNotes.Add(record);
        await Db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = record.Id, message = "تم تسجيل الملاحظة بنجاح" }));
    }

    // ─── BATCH ADD (multiple students) ───
    [HttpPost("batch")]
    public async Task<ActionResult<ApiResponse<object>>> AddBatch([FromBody] EduNoteBatchRequest request)
    {
        if (request.StudentIds == null || request.StudentIds.Count == 0)
            return Ok(ApiResponse.Fail("لم يتم اختيار طلاب"));
        if (string.IsNullOrEmpty(request.NoteType))
            return Ok(ApiResponse.Fail("نوع الملاحظة مطلوب"));

        var students = await Db.Students
            .Where(s => request.StudentIds.Contains(s.Id))
            .ToListAsync();

        var hijriDate = request.HijriDate ?? Hijri.GetHijriDate();

        var records = new List<EducationalNote>();
        foreach (var s in students)
        {
            var note = new EducationalNote
            {
                StudentId = s.Id,
                StudentNumber = s.StudentNumber,
                StudentName = s.Name,
                Grade = s.Grade,
                Class = s.Class,
                Stage = s.Stage,
                Mobile = s.Mobile,
                NoteType = request.NoteType,
                Details = request.Details ?? "",
                TeacherName = request.TeacherName ?? "الوكيل",
                HijriDate = hijriDate,
                RecordedAt = DateTime.UtcNow
            };
            await StampSemesterAsync(note);
            records.Add(note);
        }

        Db.EducationalNotes.AddRange(records);
        await Db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { message = $"تم حفظ {records.Count} ملاحظة بنجاح", count = records.Count }));
    }

    // ─── UPDATE ───
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse>> Update(int id, [FromBody] EducationalNoteRequest request)
    {
        var record = await Db.EducationalNotes.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse.Fail("السجل غير موجود"));

        if (!string.IsNullOrEmpty(request.NoteType))
            record.NoteType = request.NoteType;
        if (!string.IsNullOrEmpty(request.Details))
            record.Details = request.Details;
        if (!string.IsNullOrEmpty(request.TeacherName))
            record.TeacherName = request.TeacherName;
        if (request.HijriDate != null)
            record.HijriDate = request.HijriDate;

        await Db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث الملاحظة بنجاح"));
    }

    // ─── UPDATE SENT STATUS ───
    [HttpPut("{id}/sent")]
    public async Task<ActionResult<ApiResponse>> UpdateSentStatus(int id, [FromBody] CommonUpdateSentRequest request)
    {
        return await UpdateSentStatusAsync(Db.EducationalNotes, id, request.IsSent);
    }

    // ─── BATCH UPDATE SENT STATUS ───
    [HttpPut("sent-batch")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSentStatusBatch([FromBody] CommonBulkIdsRequest request)
    {
        return await UpdateSentBatchAsync(Db.EducationalNotes, request.Ids);
    }

    // ─── MARK ALL STUDENT NOTES AS SENT (مطابق للأصلي: updateEduNoteSentStatus بمعرف الطالب) ───
    [HttpPut("sent-by-student/{studentId}")]
    public async Task<ActionResult<ApiResponse>> UpdateSentByStudent(int studentId)
    {
        var records = await Db.EducationalNotes
            .Where(r => r.StudentId == studentId && !r.IsSent)
            .ToListAsync();

        foreach (var r in records) r.IsSent = true;
        await Db.SaveChangesAsync();

        return Ok(ApiResponse.Ok($"تم تحديث {records.Count} ملاحظة للطالب"));
    }

    // ─── SEND WHATSAPP (individual) ───
    [HttpPost("{id}/send-whatsapp")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsApp(int id,
        [FromBody] SendEduWhatsAppRequest? request = null)
    {
        var record = await Db.EducationalNotes.FindAsync(id);
        if (record == null)
            return Ok(ApiResponse<object>.Fail("السجل غير موجود"));

        var message = request?.Message ?? BuildEduWhatsAppMessage(record);

        return await SendWhatsAppSingleAsync(
            record, record.Mobile, message,
            request?.SenderPhone,
            "ملاحظة تربوية",
            "إشعار ملاحظة تربوية",
            request?.SentBy ?? "الوكيل");
    }

    // ─── SEND WHATSAPP BULK ───
    [HttpPost("send-whatsapp-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> SendWhatsAppBulk([FromBody] CommonBulkSendWhatsAppRequest request)
    {
        var records = await Db.EducationalNotes
            .Where(r => request.Ids.Contains(r.Id))
            .ToListAsync();

        var (sentCount, failedCount, total) = await SendWhatsAppBulkCoreAsync(
            records,
            r => r.Mobile,
            r => Task.FromResult(BuildEduWhatsAppMessage(r)),
            request.SenderPhone,
            "ملاحظة تربوية",
            _ => "إشعار ملاحظة تربوية",
            request.SentBy ?? "الوكيل",
            speed: request.Speed,
            customDelaySeconds: request.CustomDelaySeconds);

        return Ok(ApiResponse<object>.Ok(new { success = sentCount, fail = failedCount, total }));
    }

    // ─── DELETE ───
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        return await DeleteRecordAsync(Db.EducationalNotes, id, successMessage: "تم حذف الملاحظة بنجاح");
    }

    // ─── BULK DELETE ───
    [HttpPost("delete-bulk")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteBulk([FromBody] CommonBulkIdsRequest request)
    {
        return await DeleteBulkAsync(Db.EducationalNotes, request.Ids);
    }

    // ─── STUDENT SUMMARY ───
    [HttpGet("student-summary/{studentId}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentSummary(int studentId)
    {
        var records = await Db.EducationalNotes
            .Where(r => r.StudentId == studentId)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync();

        var summary = new
        {
            total = records.Count,
            sent = records.Count(r => r.IsSent),
            notSent = records.Count(r => !r.IsSent),
            byType = records.GroupBy(r => r.NoteType)
                .Select(g => new { type = g.Key, count = g.Count() })
                .ToList(),
            recent = records.Take(10)
                .Select(r => new { r.Id, r.NoteType, r.Details, r.TeacherName, r.HijriDate, r.RecordedAt, r.IsSent })
                .ToList()
        };

        return Ok(ApiResponse<object>.Ok(summary));
    }

    // ─── STUDENT COUNT ───
    [HttpGet("student-count/{studentId}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentCount(int studentId)
    {
        var count = await Db.EducationalNotes.CountAsync(r => r.StudentId == studentId);
        return Ok(ApiResponse<object>.Ok(new { studentId, count }));
    }

    // ─── REPORT ───
    [HttpGet("report")]
    public async Task<ActionResult<ApiResponse<object>>> GetReport([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.EducationalNotes.AsQueryable(), stage);

        var records = await query.ToListAsync();

        var topStudents = records
            .GroupBy(r => new { r.StudentId, r.StudentName, r.Grade, r.Class })
            .Select(g => new { g.Key.StudentId, g.Key.StudentName, grade = g.Key.Grade, className = g.Key.Class, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToList();

        var byClass = records
            .GroupBy(r => r.Grade + " " + r.Class)
            .Select(g => new { className = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var byType = records
            .GroupBy(r => r.NoteType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var byGrade = records
            .GroupBy(r => r.Grade)
            .Select(g => new { grade = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            total = records.Count,
            uniqueStudents = records.Select(r => r.StudentId).Distinct().Count(),
            sent = records.Count(r => r.IsSent),
            unsent = records.Count(r => !r.IsSent),
            topStudents,
            byClass,
            byGrade,
            byType
        }));
    }

    // ─── NOTE TYPES (CRUD) ───
    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetTypes([FromQuery] string? stage = null)
    {
        var query = Db.NoteTypeDefs.AsQueryable();
        if (!string.IsNullOrEmpty(stage) && Enum.TryParse<Stage>(stage, true, out var stageEnum))
            query = query.Where(t => t.Stage == stageEnum);

        var types = await query.Select(t => t.NoteType).ToListAsync();

        if (types.Count == 0)
        {
            types = GetDefaultNoteTypes();
        }

        return Ok(ApiResponse<List<string>>.Ok(types));
    }

    [HttpPost("types")]
    public async Task<ActionResult<ApiResponse>> SaveTypes([FromBody] SaveNoteTypesRequest request)
    {
        if (string.IsNullOrEmpty(request.Stage) || !Enum.TryParse<Stage>(request.Stage, true, out var stageEnum))
            return Ok(ApiResponse.Fail("المرحلة مطلوبة"));

        var existing = await Db.NoteTypeDefs.Where(t => t.Stage == stageEnum).ToListAsync();
        Db.NoteTypeDefs.RemoveRange(existing);

        foreach (var type in request.Types ?? new List<string>())
        {
            Db.NoteTypeDefs.Add(new NoteTypeDef
            {
                Stage = stageEnum,
                NoteType = type,
                CreatedAt = DateTime.UtcNow
            });
        }

        await Db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم حفظ الأنواع بنجاح"));
    }

    // ─── EXPORT CSV ───
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv([FromQuery] string? stage = null)
    {
        var query = ApplyStageFilter(Db.EducationalNotes.AsQueryable(), stage);

        var records = await query.OrderByDescending(r => r.RecordedAt).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("رقم الطالب,اسم الطالب,الصف,الفصل,نوع الملاحظة,التفاصيل,المسجل,التاريخ الهجري,تم الإرسال");

        foreach (var r in records)
        {
            sb.AppendLine($"\"{r.StudentNumber}\",\"{r.StudentName}\",\"{r.Grade}\",\"{r.Class}\",\"{r.NoteType}\",\"{r.Details}\",\"{r.TeacherName}\",\"{r.HijriDate}\",\"{(r.IsSent ? "نعم" : "لا")}\"");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "educational_notes.csv");
    }

    // ─── Helper ───
    private string BuildEduWhatsAppMessage(EducationalNote record)
    {
        return $"*إشعار ملاحظة تربوية*\n\nالسلام عليكم ورحمة الله وبركاته\nولي أمر الطالب: *{record.StudentName}*\nالصف: {record.Grade} - الفصل: {record.Class}\n\nنود إبلاغكم بتسجيل ملاحظة تربوية على ابنكم:\n*نوع الملاحظة:* {record.NoteType}{(string.IsNullOrEmpty(record.Details) ? "" : $"\n*التفاصيل:* {record.Details}")}\n\n*التاريخ:* {record.HijriDate}\n\nنأمل متابعة الطالب والتواصل مع المدرسة.";
    }

    private static List<string> GetDefaultNoteTypes() => new()
    {
        "عدم حل الواجب",
        "عدم الحفظ",
        "عدم المشاركة والتفاعل",
        "عدم إحضار الكتاب الدراسي",
        "عدم إحضار الدفتر",
        "كثرة السرحان داخل الفصل",
        "عدم إحضار أدوات الرسم",
        "عدم إحضار الأدوات الهندسية",
        "عدم إحضار الملابس الرياضية",
        "النوم داخل الفصل",
        "عدم تدوين الملاحظات مع المعلم",
        "إهمال تسليم البحوث والمشاريع",
        "عدم المذاكرة للاختبارات القصيرة",
        "الانشغال بمادة أخرى أثناء الحصة",
        "عدم تصحيح الأخطاء في الدفتر",
        "عدم إحضار ملف الإنجاز"
    };
}

// ─── DTOs ───
public class EducationalNoteRequest
{
    public int StudentId { get; set; }
    public string? NoteType { get; set; }
    public string? Details { get; set; }
    public string? TeacherName { get; set; }
    public string? HijriDate { get; set; }
}

public class EduNoteBatchRequest
{
    public List<int> StudentIds { get; set; } = new();
    public string? NoteType { get; set; }
    public string? Details { get; set; }
    public string? TeacherName { get; set; }
    public string? HijriDate { get; set; }
}

public class SendEduWhatsAppRequest
{
    public string? SenderPhone { get; set; }
    public string? Message { get; set; }
    public string? SentBy { get; set; }
}

public class SaveNoteTypesRequest
{
    public string? Stage { get; set; }
    public List<string>? Types { get; set; }
}
