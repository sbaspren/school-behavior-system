using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PortfolioController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISemesterService _semester;

    public PortfolioController(AppDbContext db, ISemesterService semester)
    {
        _db = db;
        _semester = semester;
    }

    /// <summary>
    /// GET /api/portfolio/completion — نسب اكتمال المؤشرات الأربعة
    /// </summary>
    [HttpGet("completion")]
    public async Task<ActionResult> GetCompletion()
    {
        var sem = _semester.CurrentSemester;
        var year = _semester.CurrentAcademicYear;

        // ── المؤشر ١: الانضباط المدرسي ──
        var hasViolations = await _db.Violations.AnyAsync(v => v.Semester == sem && v.AcademicYear == year);
        var hasAbsence = await _db.DailyAbsences.AnyAsync(a => a.Semester == sem && a.AcademicYear == year);
        var hasTardiness = await _db.TardinessRecords.AnyAsync(t => t.Semester == sem && t.AcademicYear == year);
        var hasPermissions = await _db.PermissionRecords.AnyAsync(p => p.Semester == sem && p.AcademicYear == year);
        var hasPositive = await _db.PositiveBehaviors.AnyAsync(b => b.Semester == sem && b.AcademicYear == year);

        var disciplineItems = new[] { hasViolations, hasAbsence, hasTardiness, hasPermissions, hasPositive };
        var disciplineScore = disciplineItems.Count(x => x);
        var disciplineTotal = disciplineItems.Length;

        // ── المؤشر ٢: مشاركة الأسرة ──
        var commCount = await _db.CommunicationLogs.CountAsync(c => c.Semester == sem && c.AcademicYear == year);
        var hasSentMessages = commCount >= 10;
        var hasParentExcuses = await _db.ParentExcuses.AnyAsync();

        var familyItems = new[] { hasSentMessages, hasParentExcuses };
        var familyScore = familyItems.Count(x => x);
        var familyTotal = familyItems.Length;

        // ── المؤشر ٣: حقوق المتعلمين وحمايتهم ──
        // يُقاس من وجود مخالفات مرصودة + وجود سلوك إيجابي كموازنة
        var highRiskViolations = await _db.Violations.CountAsync(v => v.Degree >= 4 && v.Semester == sem && v.AcademicYear == year);
        var hasProtectionRecords = hasViolations; // المخالفات المرصودة = دليل على المتابعة
        var hasRightsMonitoring = highRiskViolations >= 0; // أي رصد = دليل

        var rightsItems = new[] { hasProtectionRecords, hasRightsMonitoring };
        var rightsScore = rightsItems.Count(x => x);
        var rightsTotal = rightsItems.Length;

        // ── المؤشر ٤: التزام المتعلمين بالسلوك ──
        var hasNotes = await _db.EducationalNotes.AnyAsync(n => n.Semester == sem && n.AcademicYear == year);

        var behaviorItems = new[] { hasPositive, hasNotes, hasViolations };
        var behaviorScore = behaviorItems.Count(x => x);
        var behaviorTotal = behaviorItems.Length;

        // ── اللجان والاجتماعات ──
        var committeesWithMembers = await _db.Committees.CountAsync(c => c.IsActive && c.MembersList.Any());
        var totalMeetings = await _db.CommitteeMeetings.CountAsync();

        // ── الإحصائيات العامة ──
        var totalViolations = await _db.Violations.CountAsync(v => v.Semester == sem && v.AcademicYear == year);
        var totalAbsences = await _db.DailyAbsences.CountAsync(a => a.Semester == sem && a.AcademicYear == year);

        return Ok(ApiResponse<object>.Ok(new
        {
            indicators = new[]
            {
                new {
                    id = 1,
                    name = "الانضباط المدرسي",
                    code = "٣-١-٢-١",
                    score = disciplineScore,
                    total = disciplineTotal,
                    percentage = disciplineTotal > 0 ? (int)Math.Round(100.0 * disciplineScore / disciplineTotal) : 0,
                    color = "#1B3A6B",
                    details = new[] {
                        new { label = "المخالفات السلوكية", exists = hasViolations, count = totalViolations },
                        new { label = "سجلات الغياب", exists = hasAbsence, count = totalAbsences },
                        new { label = "سجلات التأخر", exists = hasTardiness, count = 0 },
                        new { label = "سجلات الاستئذان", exists = hasPermissions, count = 0 },
                        new { label = "السلوك الإيجابي", exists = hasPositive, count = 0 },
                    }
                },
                new {
                    id = 2,
                    name = "مشاركة الأسرة",
                    code = "٢-١-٣-١",
                    score = familyScore,
                    total = familyTotal,
                    percentage = familyTotal > 0 ? (int)Math.Round(100.0 * familyScore / familyTotal) : 0,
                    color = "#1A6B3C",
                    details = new[] {
                        new { label = "رسائل التواصل (≥١٠)", exists = hasSentMessages, count = commCount },
                        new { label = "أعذار أولياء الأمور", exists = hasParentExcuses, count = 0 },
                    }
                },
                new {
                    id = 3,
                    name = "حقوق المتعلمين وحمايتهم",
                    code = "١-١-٥-١",
                    score = rightsScore,
                    total = rightsTotal,
                    percentage = rightsTotal > 0 ? (int)Math.Round(100.0 * rightsScore / rightsTotal) : 0,
                    color = "#C05B00",
                    details = new[] {
                        new { label = "رصد المخالفات", exists = hasProtectionRecords, count = 0 },
                        new { label = "متابعة مؤشرات الخطر", exists = hasRightsMonitoring, count = highRiskViolations },
                    }
                },
                new {
                    id = 4,
                    name = "التزام المتعلمين بالسلوك",
                    code = "٥-١-٢-٣",
                    score = behaviorScore,
                    total = behaviorTotal,
                    percentage = behaviorTotal > 0 ? (int)Math.Round(100.0 * behaviorScore / behaviorTotal) : 0,
                    color = "#B8860B",
                    details = new[] {
                        new { label = "السلوك الإيجابي", exists = hasPositive, count = 0 },
                        new { label = "الملاحظات التربوية", exists = hasNotes, count = 0 },
                        new { label = "المتابعة السلوكية", exists = hasViolations, count = 0 },
                    }
                },
            },
            summary = new
            {
                overallPercentage = (disciplineTotal + familyTotal + rightsTotal + behaviorTotal) > 0
                    ? (int)Math.Round(100.0 * (disciplineScore + familyScore + rightsScore + behaviorScore) / (disciplineTotal + familyTotal + rightsTotal + behaviorTotal))
                    : 0,
                committeesReady = committeesWithMembers,
                totalMeetings,
                readyEvidence = disciplineScore + familyScore + rightsScore + behaviorScore,
            }
        }));
    }
}
