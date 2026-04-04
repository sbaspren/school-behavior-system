using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AcademicController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly string[] NonAcademicSubjects = ["السلوك", "المواظبة", "النشاط"];

    public AcademicController(AppDbContext db) => _db = db;

    // ── 1. Get All Data (summary + grades + periods) ──
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll([FromQuery] string stage)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var summary = await _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum)
            .OrderByDescending(s => s.ImportedAt)
            .ToListAsync();

        var grades = await _db.AcademicGrades
            .Where(g => g.Stage == stageEnum)
            .ToListAsync();

        var periods = summary
            .Select(s => new { s.Semester, s.Period })
            .Distinct()
            .ToList();

        return Ok(ApiResponse<object>.Ok(new { summary, grades, periods }));
    }

    // ── 2. Get Periods ──
    [HttpGet("periods")]
    public async Task<ActionResult<ApiResponse<object>>> GetPeriods([FromQuery] string stage)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var periods = await _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum)
            .GroupBy(s => new { s.Semester, s.Period })
            .Select(g => new { g.Key.Semester, g.Key.Period, count = g.Count() })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(periods));
    }

    // ── 3. Quick Stats ──
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetStats(
        [FromQuery] string stage,
        [FromQuery] string? semester = null,
        [FromQuery] string? period = null)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var summaryQ = _db.AcademicSummaries.Where(s => s.Stage == stageEnum);
        var gradesQ = _db.AcademicGrades.Where(g => g.Stage == stageEnum);

        if (!string.IsNullOrEmpty(semester))
        {
            summaryQ = summaryQ.Where(s => s.Semester == semester);
            gradesQ = gradesQ.Where(g => g.Semester == semester);
        }
        if (!string.IsNullOrEmpty(period))
        {
            summaryQ = summaryQ.Where(s => s.Period == period);
            gradesQ = gradesQ.Where(g => g.Period == period);
        }

        var summaryList = await summaryQ.ToListAsync();
        var gradesList = await gradesQ.ToListAsync();

        var avgs = summaryList.Where(s => s.Average.HasValue && s.Average > 0).Select(s => s.Average!.Value).ToList();
        var totalStudents = summaryList.Count;

        // Categories
        int excellent = 0, good = 0, average = 0, weak = 0, danger = 0;
        foreach (var a in avgs)
        {
            if (a >= 95) excellent++;
            else if (a >= 80) good++;
            else if (a >= 65) average++;
            else if (a >= 50) weak++;
            else danger++;
        }

        // Grade distribution
        var gradeDist = summaryList.GroupBy(s => string.IsNullOrEmpty(s.GeneralGrade) ? "غير محدد" : s.GeneralGrade)
            .ToDictionary(g => g.Key, g => g.Count());

        // Subject stats
        var subjectStats = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => g.Subject)
            .Select(g =>
            {
                var totals = g.Select(x => x.Total).ToList();
                return new
                {
                    name = g.Key,
                    avg = totals.Count > 0 ? Math.Round(totals.Average(), 1) : 0,
                    max = totals.Count > 0 ? totals.Max() : 0,
                    min = totals.Count > 0 ? totals.Min() : 0,
                    count = totals.Count,
                    above90 = totals.Count(t => t >= 90),
                    below60 = totals.Count(t => t < 60),
                    below50 = totals.Count(t => t < 50)
                };
            })
            .OrderBy(s => s.avg)
            .ToList();

        // Top 10 / Bottom 10
        var sorted = summaryList.OrderByDescending(s => s.Average ?? 0).ToList();
        var topTen = sorted.Take(10).ToList();
        var bottomTen = sorted.AsEnumerable().Reverse().Take(10).ToList();

        // Class summary
        var classSummary = summaryList
            .GroupBy(s => new { s.Grade, s.ClassNum })
            .Select(g =>
            {
                var cAvgs = g.Where(s => s.Average.HasValue && s.Average > 0).Select(s => s.Average!.Value).ToList();
                return new
                {
                    label = g.Key.Grade + " - " + g.Key.ClassNum,
                    grade = g.Key.Grade,
                    classNum = g.Key.ClassNum,
                    count = g.Count(),
                    avg = cAvgs.Count > 0 ? Math.Round(cAvgs.Average(), 2) : 0,
                    max = cAvgs.Count > 0 ? Math.Round(cAvgs.Max(), 2) : 0,
                    min = cAvgs.Count > 0 ? Math.Round(cAvgs.Min(), 2) : 0,
                    excellent = cAvgs.Count(v => v >= 95),
                    weak = cAvgs.Count(v => v < 65)
                };
            })
            .ToList();

        // Danger students (3+ subjects < 60)
        var studentGradesMap = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject) && g.Total < 60)
            .GroupBy(g => g.IdentityNo)
            .Where(g => g.Count() >= 3)
            .Select(g => new
            {
                identity = g.Key,
                name = g.First().StudentName,
                weakSubjects = g.Select(x => x.Subject).ToList(),
                weakCount = g.Count()
            })
            .ToList();

        // Absence stats
        var totalAbsence = summaryList.Sum(s => s.Absence);
        var totalTardiness = summaryList.Sum(s => s.Tardiness);
        var absenceStudents = summaryList.Count(s => s.Absence > 0);

        // Available periods
        var allPeriods = await _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum)
            .GroupBy(s => new { s.Semester, s.Period })
            .Select(g => new { g.Key.Semester, g.Key.Period, count = g.Count() })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            totalStudents,
            avgAll = avgs.Count > 0 ? Math.Round(avgs.Average(), 2) : 0,
            maxAvg = avgs.Count > 0 ? Math.Round(avgs.Max(), 2) : 0,
            minAvg = avgs.Count > 0 ? Math.Round(avgs.Min(), 2) : 0,
            gradeDist,
            categories = new { excellent, good, average, weak, danger },
            subjects = subjectStats,
            topTen,
            bottomTen,
            classSummary,
            dangerStudents = studentGradesMap,
            absence = new { total = totalAbsence, tardiness = totalTardiness, studentsWithAbsence = absenceStudents },
            periods = allPeriods
        }));
    }

    // ── 4. Student Report ──
    [HttpGet("student/{identityNo}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentReport(
        [FromRoute] string identityNo, [FromQuery] string stage)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var studentSummary = await _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum && s.IdentityNo == identityNo)
            .OrderBy(s => s.Semester).ThenBy(s => s.Period)
            .ToListAsync();

        if (studentSummary.Count == 0)
            return NotFound(ApiResponse<object>.Fail("لم يتم العثور على الطالب"));

        var studentGrades = await _db.AcademicGrades
            .Where(g => g.Stage == stageEnum && g.IdentityNo == identityNo)
            .ToListAsync();

        var latest = studentSummary.Last();
        var latestGrades = studentGrades
            .Where(g => g.Semester == latest.Semester && g.Period == latest.Period)
            .ToList();

        // Strengths & weaknesses
        var academicGrades = latestGrades
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .Select(g => new { name = g.Subject, total = g.Total, grade = g.GradeLabel })
            .OrderByDescending(g => g.total)
            .ToList();

        var strengths = academicGrades.Where(g => g.total >= 90).Select(g => g.name).ToList();
        var weaknesses = academicGrades.Where(g => g.total < 65).Select(g => g.name).ToList();

        var weaknessPattern = "لا يوجد";
        if (weaknesses.Count > 0)
        {
            var scienceWeak = weaknesses.Count(s => s == "الرياضيات" || s == "العلوم");
            if (scienceWeak == weaknesses.Count) weaknessPattern = "ضعف علمي";
            else if (weaknesses.Count >= 4) weaknessPattern = "ضعف شامل";
            else weaknessPattern = "ضعف جزئي";
        }

        // Exam vs classwork
        var examVsWork = latestGrades
            .Where(g => !NonAcademicSubjects.Contains(g.Subject) && (g.FinalExam > 0 || g.EvalTools + g.ShortTests > 0))
            .Select(g => new { name = g.Subject, finalExam = g.FinalExam, classWork = g.EvalTools + g.ShortTests })
            .ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            student = new
            {
                name = studentSummary[0].StudentName,
                identity = identityNo,
                grade = studentSummary[0].Grade,
                classNum = studentSummary[0].ClassNum
            },
            summary = studentSummary,
            grades = studentGrades,
            analysis = new
            {
                strengths,
                weaknesses,
                weaknessPattern,
                academicGrades,
                examVsWork,
                absence = latest.Absence,
                tardiness = latest.Tardiness,
                behaviorExcellent = latest.BehaviorExcellent,
                behaviorPositive = latest.BehaviorPositive
            }
        }));
    }

    // ── 5. Class Comparison ──
    [HttpGet("class-comparison")]
    public async Task<ActionResult<ApiResponse<object>>> GetClassComparison(
        [FromQuery] string stage, [FromQuery] string? semester = null, [FromQuery] string? period = null)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var q = _db.AcademicGrades.Where(g => g.Stage == stageEnum);
        if (!string.IsNullOrEmpty(semester)) q = q.Where(g => g.Semester == semester);
        if (!string.IsNullOrEmpty(period)) q = q.Where(g => g.Period == period);

        var grades = await q.ToListAsync();

        var comparison = grades
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => g.Subject)
            .Select(sg => new
            {
                subject = sg.Key,
                classes = sg.GroupBy(g => g.Grade + " فصل " + g.ClassNum)
                    .Select(cg =>
                    {
                        var totals = cg.Select(x => x.Total).ToList();
                        return new
                        {
                            classLabel = cg.Key,
                            avg = totals.Count > 0 ? Math.Round(totals.Average(), 1) : 0,
                            count = totals.Count,
                            above90 = totals.Count(t => t >= 90),
                            below60 = totals.Count(t => t < 60)
                        };
                    })
                    .ToList()
            })
            .ToList();

        return Ok(ApiResponse<object>.Ok(comparison));
    }

    // ── 6. Student Progress ──
    [HttpGet("progress/{identityNo}")]
    public async Task<ActionResult<ApiResponse<object>>> GetStudentProgress(
        [FromRoute] string identityNo, [FromQuery] string stage)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var summaryList = await _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum && s.IdentityNo == identityNo)
            .OrderBy(s => s.Semester).ThenBy(s => s.Period)
            .ToListAsync();

        if (summaryList.Count == 0)
            return NotFound(ApiResponse<object>.Fail("لم يتم العثور على الطالب"));

        var gradesList = await _db.AcademicGrades
            .Where(g => g.Stage == stageEnum && g.IdentityNo == identityNo)
            .ToListAsync();

        var avgProgress = summaryList.Select(s => new
        {
            s.Semester, s.Period, average = s.Average ?? 0, s.GeneralGrade
        }).ToList();

        var subjectProgress = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => g.Subject)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => new { x.Semester, x.Period, total = x.Total }).ToList() as object
            );

        return Ok(ApiResponse<object>.Ok(new
        {
            student = new { name = summaryList[0].StudentName, identity = identityNo },
            avgProgress,
            subjectProgress
        }));
    }

    // ── 7. Search ──
    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<object>>> Search(
        [FromQuery] string stage,
        [FromQuery] string? semester = null,
        [FromQuery] string? period = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? classNum = null,
        [FromQuery] string? name = null,
        [FromQuery] string? generalGrade = null,
        [FromQuery] double? avgAbove = null,
        [FromQuery] double? avgBelow = null,
        [FromQuery] string? sortBy = "avg_desc")
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var q = _db.AcademicSummaries.Where(s => s.Stage == stageEnum);

        if (!string.IsNullOrEmpty(semester)) q = q.Where(s => s.Semester == semester);
        if (!string.IsNullOrEmpty(period)) q = q.Where(s => s.Period == period);
        if (!string.IsNullOrEmpty(grade)) q = q.Where(s => s.Grade.Contains(grade));
        if (!string.IsNullOrEmpty(classNum)) q = q.Where(s => s.ClassNum == classNum);
        if (!string.IsNullOrEmpty(name)) q = q.Where(s => s.StudentName.Contains(name));
        if (!string.IsNullOrEmpty(generalGrade)) q = q.Where(s => s.GeneralGrade == generalGrade);
        if (avgAbove.HasValue) q = q.Where(s => s.Average >= avgAbove.Value);
        if (avgBelow.HasValue) q = q.Where(s => s.Average < avgBelow.Value);

        q = sortBy switch
        {
            "avg_asc" => q.OrderBy(s => s.Average),
            "name" => q.OrderBy(s => s.StudentName),
            _ => q.OrderByDescending(s => s.Average)
        };

        var total = await q.CountAsync();
        var results = await q.Take(100).ToListAsync();
        return Ok(ApiResponse<object>.Ok(new { records = results, total }));
    }

    // ── 8. Import (save parsed data from client-side SheetJS) ──
    [HttpPost("import")]
    public async Task<ActionResult<ApiResponse<object>>> Import([FromBody] AcademicImportRequest request)
    {
        if (!Enum.TryParse<Stage>(request.Stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        if (request.Students == null || request.Students.Count == 0)
            return BadRequest(ApiResponse<object>.Fail("لا توجد بيانات طلاب"));

        var detectedSemester = request.Students.FirstOrDefault(s => !string.IsNullOrEmpty(s.Semester))?.Semester ?? "غير محدد";
        var gradesInFile = request.Students.Select(s => s.Grade).Where(g => !string.IsNullOrEmpty(g)).Distinct().ToList();

        // Delete old data for same period + grades only
        if (!string.IsNullOrEmpty(detectedSemester) && gradesInFile.Count > 0)
        {
            var oldSummaries = await _db.AcademicSummaries
                .Where(s => s.Stage == stageEnum && s.Semester == detectedSemester && s.Period == request.Period && gradesInFile.Contains(s.Grade))
                .ToListAsync();
            _db.AcademicSummaries.RemoveRange(oldSummaries);

            var oldGrades = await _db.AcademicGrades
                .Where(g => g.Stage == stageEnum && g.Semester == detectedSemester && g.Period == request.Period && gradesInFile.Contains(g.Grade))
                .ToListAsync();
            _db.AcademicGrades.RemoveRange(oldGrades);
        }

        // Insert new data
        foreach (var s in request.Students)
        {
            var sem = !string.IsNullOrEmpty(s.Semester) ? s.Semester : detectedSemester;

            _db.AcademicSummaries.Add(new AcademicSummary
            {
                IdentityNo = s.Identity,
                StudentName = s.Name,
                Grade = s.Grade,
                ClassNum = s.ClassNum,
                Stage = stageEnum,
                Semester = sem,
                Period = request.Period,
                Average = s.Average,
                GeneralGrade = s.GeneralGrade,
                RankGrade = s.RankGrade,
                RankClass = s.RankClass,
                Absence = s.Absence,
                Tardiness = s.Tardiness,
                BehaviorExcellent = s.BehaviorExcellent,
                BehaviorPositive = s.BehaviorPositive
            });

            if (s.Subjects != null)
            {
                foreach (var subj in s.Subjects)
                {
                    _db.AcademicGrades.Add(new AcademicGrade
                    {
                        IdentityNo = s.Identity,
                        StudentName = s.Name,
                        Grade = s.Grade,
                        ClassNum = s.ClassNum,
                        Stage = stageEnum,
                        Semester = sem,
                        Period = request.Period,
                        Subject = subj.Name,
                        Total = subj.Total,
                        FinalExam = subj.FinalExam,
                        EvalTools = subj.EvalTools,
                        ShortTests = subj.ShortTests,
                        GradeLabel = subj.Grade
                    });
                }
            }
        }

        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            imported = request.Students.Count,
            semester = detectedSemester,
            grades = gradesInFile,
            message = "تم حفظ " + request.Students.Count + " طالب بنجاح"
        }));
    }

    // ── 9. Delete Period ──
    [HttpDelete("period")]
    public async Task<ActionResult<ApiResponse<object>>> DeletePeriod(
        [FromQuery] string stage, [FromQuery] string semester, [FromQuery] string period,
        [FromQuery] string? grades = null)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        // deletePeriodDataByGrades_: حذف صفوف محددة فقط أو كل الفترة
        var gradeList = !string.IsNullOrEmpty(grades)
            ? grades.Split(',').Select(g => g.Trim()).Where(g => g.Length > 0).ToList()
            : null;

        var summaryQ = _db.AcademicSummaries
            .Where(s => s.Stage == stageEnum && s.Semester == semester && s.Period == period);
        var gradeQ = _db.AcademicGrades
            .Where(g => g.Stage == stageEnum && g.Semester == semester && g.Period == period);

        if (gradeList != null && gradeList.Count > 0)
        {
            summaryQ = summaryQ.Where(s => gradeList.Contains(s.Grade));
            gradeQ = gradeQ.Where(g => gradeList.Contains(g.Grade));
        }

        var summaries = await summaryQ.ToListAsync();
        _db.AcademicSummaries.RemoveRange(summaries);

        var gradeRecords = await gradeQ.ToListAsync();
        _db.AcademicGrades.RemoveRange(gradeRecords);

        await _db.SaveChangesAsync();

        var msg = gradeList != null
            ? $"تم حذف بيانات {string.Join("، ", gradeList)} من {period} - {semester}"
            : $"تم حذف بيانات {period} - {semester}";
        return Ok(ApiResponse<object>.Ok(new { message = msg, deletedCount = summaries.Count }));
    }

    // ── 10. Export CSV ──
    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] string stage,
        [FromQuery] string? semester = null, [FromQuery] string? period = null)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest("مرحلة غير صحيحة");

        var q = _db.AcademicSummaries.Where(s => s.Stage == stageEnum);
        if (!string.IsNullOrEmpty(semester)) q = q.Where(s => s.Semester == semester);
        if (!string.IsNullOrEmpty(period)) q = q.Where(s => s.Period == period);

        var records = await q.OrderByDescending(s => s.Average).ToListAsync();

        var csv = "رقم الهوية,اسم الطالب,الصف,الفصل,الفصل الدراسي,الفترة,المعدل,التقدير العام,ترتيب الصف,ترتيب الفصل,الغياب,التأخر\n";
        foreach (var r in records)
        {
            csv += $"{r.IdentityNo},{r.StudentName},{r.Grade},{r.ClassNum},{r.Semester},{r.Period},{r.Average},{r.GeneralGrade},{r.RankGrade},{r.RankClass},{r.Absence},{r.Tardiness}\n";
        }

        return File(System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(csv)).ToArray(),
            "text/csv; charset=utf-8", $"academic_{stage}.csv");
    }

    // ══════════════════════════════════════════════════════════════
    // 11. Advanced Statistics — الإحصائيات المتقدمة
    // SD, Median, Mode, CV, Gaps per Subject, Pearson Correlation,
    // Weak/Failing students, Top 10 per class, Risk Index
    // ══════════════════════════════════════════════════════════════
    [HttpGet("advanced-stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetAdvancedStats(
        [FromQuery] string stage,
        [FromQuery] string? semester = null,
        [FromQuery] string? period = null)
    {
        if (!Enum.TryParse<Stage>(stage, true, out var stageEnum))
            return BadRequest(ApiResponse<object>.Fail("مرحلة غير صحيحة"));

        var summaryQ = _db.AcademicSummaries.Where(s => s.Stage == stageEnum);
        var gradesQ = _db.AcademicGrades.Where(s => s.Stage == stageEnum);
        if (!string.IsNullOrEmpty(semester))
        {
            summaryQ = summaryQ.Where(s => s.Semester == semester);
            gradesQ = gradesQ.Where(g => g.Semester == semester);
        }
        if (!string.IsNullOrEmpty(period))
        {
            summaryQ = summaryQ.Where(s => s.Period == period);
            gradesQ = gradesQ.Where(g => g.Period == period);
        }

        var summaryList = await summaryQ.ToListAsync();
        var gradesList = await gradesQ.ToListAsync();

        if (summaryList.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { empty = true }));

        var allAvgs = summaryList.Where(s => s.Average.HasValue && s.Average > 0)
            .Select(s => s.Average!.Value).ToList();

        // ── Helper functions ──
        static double CalcSD(List<double> vals)
        {
            if (vals.Count < 2) return 0;
            var mean = vals.Average();
            return Math.Round(Math.Sqrt(vals.Sum(v => (v - mean) * (v - mean)) / (vals.Count - 1)), 2);
        }
        static double CalcMedian(List<double> vals)
        {
            if (vals.Count == 0) return 0;
            var sorted = vals.OrderBy(v => v).ToList();
            int n = sorted.Count;
            return n % 2 == 1 ? sorted[n / 2] : Math.Round((sorted[n / 2 - 1] + sorted[n / 2]) / 2, 2);
        }
        static double CalcMode(List<double> vals)
        {
            if (vals.Count == 0) return 0;
            return vals.GroupBy(v => Math.Round(v)).OrderByDescending(g => g.Count()).First().Key;
        }
        static double CalcCV(double mean, double sd) => mean > 0 ? Math.Round(sd / mean * 100, 2) : 0;
        static double CalcPearson(List<double> x, List<double> y)
        {
            int n = Math.Min(x.Count, y.Count);
            if (n < 3) return 0;
            double mx = x.Take(n).Average(), my = y.Take(n).Average();
            double num = 0, dx = 0, dy = 0;
            for (int i = 0; i < n; i++)
            {
                num += (x[i] - mx) * (y[i] - my);
                dx += (x[i] - mx) * (x[i] - mx);
                dy += (y[i] - my) * (y[i] - my);
            }
            double den = Math.Sqrt(dx * dy);
            return den > 0 ? Math.Round(num / den, 3) : 0;
        }
        // ══ 1. Overall descriptive stats ══
        var overallStats = new
        {
            totalStudents = summaryList.Count,
            mean = allAvgs.Count > 0 ? Math.Round(allAvgs.Average(), 2) : 0,
            median = CalcMedian(allAvgs),
            mode = CalcMode(allAvgs),
            sd = CalcSD(allAvgs),
            cv = CalcCV(allAvgs.Count > 0 ? allAvgs.Average() : 0, CalcSD(allAvgs)),
            max = allAvgs.Count > 0 ? Math.Round(allAvgs.Max(), 2) : 0,
            min = allAvgs.Count > 0 ? Math.Round(allAvgs.Min(), 2) : 0,
            range = allAvgs.Count > 0 ? Math.Round(allAvgs.Max() - allAvgs.Min(), 2) : 0
        };

        // ══ 2. Per-grade stats ══
        var gradeStats = summaryList
            .GroupBy(s => s.Grade)
            .Select(g =>
            {
                var avgs = g.Where(s => s.Average.HasValue && s.Average > 0).Select(s => s.Average!.Value).ToList();
                return new
                {
                    grade = g.Key,
                    count = g.Count(),
                    mean = avgs.Count > 0 ? Math.Round(avgs.Average(), 2) : 0,
                    median = CalcMedian(avgs),
                    mode = CalcMode(avgs),
                    sd = CalcSD(avgs),
                    cv = CalcCV(avgs.Count > 0 ? avgs.Average() : 0, CalcSD(avgs)),
                    max = avgs.Count > 0 ? Math.Round(avgs.Max(), 2) : 0,
                    min = avgs.Count > 0 ? Math.Round(avgs.Min(), 2) : 0,
                    distribution = new
                    {
                        excellent = avgs.Count(a => a >= 90),
                        veryGood = avgs.Count(a => a >= 80 && a < 90),
                        good = avgs.Count(a => a >= 70 && a < 80),
                        pass = avgs.Count(a => a >= 60 && a < 70),
                        fail = avgs.Count(a => a < 60)
                    }
                };
            }).ToList();

        // ══ 3. Per-class stats ══
        var classStats = summaryList
            .GroupBy(s => new { s.Grade, s.ClassNum })
            .Select(g =>
            {
                var avgs = g.Where(s => s.Average.HasValue && s.Average > 0).Select(s => s.Average!.Value).ToList();
                return new
                {
                    grade = g.Key.Grade,
                    classNum = g.Key.ClassNum,
                    label = g.Key.Grade + " فصل " + g.Key.ClassNum,
                    count = g.Count(),
                    mean = avgs.Count > 0 ? Math.Round(avgs.Average(), 2) : 0,
                    sd = CalcSD(avgs),
                    max = avgs.Count > 0 ? Math.Round(avgs.Max(), 2) : 0,
                    min = avgs.Count > 0 ? Math.Round(avgs.Min(), 2) : 0,
                    excellent = avgs.Count(a => a >= 90),
                    weak = avgs.Count(a => a < 65)
                };
            }).ToList();

        // ══ 4. Subject difficulty index with SD ══
        var subjectStats = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => new { g.Subject, g.Grade })
            .Select(g =>
            {
                var totals = g.Select(x => (double)x.Total).ToList();
                var finalExams = g.Where(x => x.FinalExam > 0).Select(x => (double)x.FinalExam).ToList();
                return new
                {
                    subject = g.Key.Subject,
                    grade = g.Key.Grade,
                    count = totals.Count,
                    mean = totals.Count > 0 ? Math.Round(totals.Average(), 1) : 0,
                    sd = CalcSD(totals),
                    median = CalcMedian(totals),
                    failRate = totals.Count > 0 ? Math.Round(totals.Count(t => t < 60) * 100.0 / totals.Count, 1) : 0,
                    weakRate = totals.Count > 0 ? Math.Round(totals.Count(t => t < 70) * 100.0 / totals.Count, 1) : 0,
                    above90 = totals.Count(t => t >= 90),
                    below60 = totals.Count(t => t < 60),
                    below50 = totals.Count(t => t < 50),
                    finalExamMean = finalExams.Count > 0 ? Math.Round(finalExams.Average(), 1) : 0
                };
            })
            .OrderBy(s => s.mean)
            .ToList();

        // ══ 5. Gap analysis per subject between classes ══
        var gapAnalysis = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => new { g.Subject, g.Grade })
            .Select(sg =>
            {
                var classAvgs = sg
                    .GroupBy(g => g.ClassNum)
                    .Select(cg => new
                    {
                        classNum = cg.Key,
                        avg = cg.Average(x => (double)x.Total)
                    }).ToList();

                double gap = classAvgs.Count >= 2
                    ? Math.Round(classAvgs.Max(c => c.avg) - classAvgs.Min(c => c.avg), 1)
                    : 0;

                return new
                {
                    subject = sg.Key.Subject,
                    grade = sg.Key.Grade,
                    gap,
                    severity = gap > 10 ? "خلل" : gap > 5 ? "تدخل" : gap > 3 ? "مراقبة" : "طبيعي",
                    classes = classAvgs.Select(c => new { c.classNum, avg = Math.Round(c.avg, 1) }).ToList()
                };
            })
            .Where(g => g.gap > 0)
            .OrderByDescending(g => g.gap)
            .ToList();

        // ══ 6. Top 10 per class ══
        var topPerClass = summaryList
            .GroupBy(s => new { s.Grade, s.ClassNum })
            .SelectMany(g => g
                .Where(s => s.Average.HasValue && s.Average > 0)
                .OrderByDescending(s => s.Average)
                .Take(10)
                .Select((s, i) => new
                {
                    rank = i + 1,
                    name = s.StudentName,
                    identity = s.IdentityNo,
                    grade = s.Grade,
                    classNum = s.ClassNum,
                    average = s.Average,
                    generalGrade = s.GeneralGrade,
                    label = s.Grade + " فصل " + s.ClassNum
                })
            ).ToList();

        // ══ 7. Failing students (any subject < 60) ══
        var failingStudents = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject) && g.Total < 60)
            .GroupBy(g => g.IdentityNo)
            .Select(g =>
            {
                var first = g.First();
                var summaryRecord = summaryList.FirstOrDefault(s => s.IdentityNo == g.Key);
                return new
                {
                    identity = g.Key,
                    name = first.StudentName,
                    grade = first.Grade,
                    classNum = first.ClassNum,
                    average = summaryRecord?.Average ?? 0,
                    absence = summaryRecord?.Absence ?? 0,
                    failSubjects = g.Select(x => new { subject = x.Subject, total = x.Total, gradeLabel = x.GradeLabel }).ToList(),
                    failCount = g.Count()
                };
            })
            .OrderByDescending(s => s.failCount)
            .ThenBy(s => s.average)
            .ToList();

        // ══ 8. Weak students (any subject < 70) with risk index ══
        var weakStudents = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => g.IdentityNo)
            .Select(g =>
            {
                var failSubj = g.Where(x => x.Total < 60).Select(x => x.Subject).ToList();
                var weakSubj = g.Where(x => x.Total >= 60 && x.Total < 70).Select(x => x.Subject).ToList();
                if (failSubj.Count == 0 && weakSubj.Count == 0) return null;

                var first = g.First();
                var summaryRecord = summaryList.FirstOrDefault(s => s.IdentityNo == g.Key);
                double avg = summaryRecord?.Average ?? 0;
                int absence = summaryRecord?.Absence ?? 0;
                int tardiness = summaryRecord?.Tardiness ?? 0;

                // Risk score calculation
                int risk = failSubj.Count * 3 + weakSubj.Count;
                if (avg > 0 && avg < 70) risk += 3;
                else if (avg > 0 && avg < 80) risk += 1;
                if (absence > 5) risk += 3;
                else if (absence > 3) risk += 2;
                else if (absence > 0) risk += 1;
                if (tardiness > 5) risk += 1;

                string riskLevel = risk >= 8 ? "عالي" : risk >= 4 ? "متوسط" : "منخفض";
                string interventionType = absence > 3 && failSubj.Count > 0 ? "مزدوج"
                    : absence > 3 ? "سلوكي" : "أكاديمي";

                return new
                {
                    identity = g.Key,
                    name = first.StudentName,
                    grade = first.Grade,
                    classNum = first.ClassNum,
                    average = avg,
                    generalGrade = summaryRecord?.GeneralGrade ?? "",
                    absence,
                    tardiness,
                    failSubjects = failSubj,
                    weakSubjects = weakSubj,
                    allSubjects = g.Where(x => x.Total < 70).Select(x => new { subject = x.Subject, total = x.Total }).ToList(),
                    riskScore = risk,
                    riskLevel,
                    interventionType
                };
            })
            .Where(s => s != null)
            .OrderByDescending(s => s!.riskScore)
            .ThenBy(s => s!.average)
            .ToList();

        // ══ 9. Correlation: absence vs achievement ══
        var corrPairs = summaryList
            .Where(s => s.Average.HasValue && s.Average > 0)
            .Select(s => new { absence = (double)s.Absence, avg = s.Average!.Value })
            .ToList();

        var absentStudents = corrPairs.Where(p => p.absence > 2).ToList();
        var nonAbsentStudents = corrPairs.Where(p => p.absence == 0).ToList();

        var correlation = new
        {
            pearsonR = CalcPearson(corrPairs.Select(p => p.absence).ToList(), corrPairs.Select(p => p.avg).ToList()),
            absentAvg = absentStudents.Count > 0 ? Math.Round(absentStudents.Average(s => s.avg), 1) : 0,
            absentCount = absentStudents.Count,
            nonAbsentAvg = nonAbsentStudents.Count > 0 ? Math.Round(nonAbsentStudents.Average(s => s.avg), 1) : 0,
            nonAbsentCount = nonAbsentStudents.Count,
            difference = absentStudents.Count > 0 && nonAbsentStudents.Count > 0
                ? Math.Round(nonAbsentStudents.Average(s => s.avg) - absentStudents.Average(s => s.avg), 1) : 0,
            interpretation = CalcPearson(corrPairs.Select(p => p.absence).ToList(), corrPairs.Select(p => p.avg).ToList()) < -0.3
                ? "علاقة سلبية واضحة" : "علاقة ضعيفة أو معدومة"
        };

        // ══ 10. Weakest subjects overall ══
        var weakestSubjects = gradesList
            .Where(g => !NonAcademicSubjects.Contains(g.Subject))
            .GroupBy(g => g.Subject)
            .Select(g => new
            {
                subject = g.Key,
                mean = g.Average(x => (double)x.Total),
                failRate = g.Count(x => x.Total < 60) * 100.0 / g.Count()
            })
            .OrderBy(s => s.mean)
            .Take(3)
            .Select(s => new { s.subject, mean = Math.Round(s.mean, 1), failRate = Math.Round(s.failRate, 1) })
            .ToList();

        // ══ 11. Executive summary ══
        var executiveSummary = new
        {
            weakestSubjects,
            weakestClasses = classStats.OrderBy(c => c.mean).Take(3).Select(c => new { c.label, c.mean }).ToList(),
            totalAtRisk = weakStudents.Count,
            atRiskPercent = summaryList.Count > 0 ? Math.Round(weakStudents.Count * 100.0 / summaryList.Count, 0) : 0,
            highRisk = weakStudents.Count(s => s!.riskLevel == "عالي"),
            mediumRisk = weakStudents.Count(s => s!.riskLevel == "متوسط"),
            lowRisk = weakStudents.Count(s => s!.riskLevel == "منخفض"),
            biggestGap = gapAnalysis.FirstOrDefault()
        };

        return Ok(ApiResponse<object>.Ok(new
        {
            overall = overallStats,
            gradeStats,
            classStats,
            subjectStats,
            gapAnalysis,
            topPerClass,
            failingStudents,
            weakStudents,
            correlation,
            executiveSummary
        }));
    }
}

// ── DTOs ──
public class AcademicImportRequest
{
    public string Stage { get; set; } = "";
    public string Period { get; set; } = "";
    public List<AcademicStudentData> Students { get; set; } = new();
}

public class AcademicStudentData
{
    public string Identity { get; set; } = "";
    public string Name { get; set; } = "";
    public string Grade { get; set; } = "";
    public string ClassNum { get; set; } = "";
    public string Semester { get; set; } = "";
    public double? Average { get; set; }
    public string GeneralGrade { get; set; } = "";
    public string RankGrade { get; set; } = "";
    public string RankClass { get; set; } = "";
    public int Absence { get; set; }
    public int Tardiness { get; set; }
    public string BehaviorExcellent { get; set; } = "";
    public string BehaviorPositive { get; set; } = "";
    public List<AcademicSubjectData>? Subjects { get; set; }
}

public class AcademicSubjectData
{
    public string Name { get; set; } = "";
    public double Total { get; set; }
    public double FinalExam { get; set; }
    public double EvalTools { get; set; }
    public double ShortTests { get; set; }
    public string Grade { get; set; } = "";
}
