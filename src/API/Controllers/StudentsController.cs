using Microsoft.AspNetCore.Authorization;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;
using System.IO.Compression;
using System.Xml.Linq;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StudentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetStudents(
        [FromQuery] string? stage = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? className = null)
    {
        var query = _db.Students.AsQueryable();

        // ★ فرض عزل المراحل — الوكيل يرى طلاب مرحلته فقط
        var effectiveStage = EnforceScopeStage(stage);
        if (!string.IsNullOrEmpty(effectiveStage) && Enum.TryParse<Stage>(effectiveStage, true, out var stageEnum))
            query = query.Where(s => s.Stage == stageEnum);
        if (!string.IsNullOrEmpty(grade))
            query = query.Where(s => s.Grade == grade);
        if (!string.IsNullOrEmpty(className))
            query = query.Where(s => s.Class == className);

        var students = await query.Select(s => new
        {
            s.Id, s.StudentNumber, s.Name,
            stage = s.Stage.ToString(), s.Grade, className = s.Class,
            s.Mobile, s.CreatedAt
        }).OrderBy(s => s.Name).ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(students.Cast<object>().ToList()));
    }

    /// <summary>
    /// ★ عزل المراحل — يقرأ scope_type و scope_value من JWT
    /// الوكيل يرى مرحلته فقط بغض النظر عن query parameter
    /// </summary>
    private string? EnforceScopeStage(string? requestedStage)
    {
        var scopeType = User.FindFirst("scope_type")?.Value;
        var scopeValue = User.FindFirst("scope_value")?.Value;

        if (string.IsNullOrEmpty(scopeType) || scopeType == "all")
            return requestedStage;

        if (scopeType == "stage" && !string.IsNullOrEmpty(scopeValue))
            return scopeValue;

        return requestedStage;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse>> AddStudent([FromBody] StudentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Ok(ApiResponse.Fail("الاسم مطلوب"));
        if (!Enum.TryParse<Stage>(request.Stage, true, out var stage))
            return Ok(ApiResponse.Fail("المرحلة غير صالحة"));

        // كشف التكرار برقم الطالب
        if (!string.IsNullOrEmpty(request.StudentNumber))
        {
            var exists = await _db.Students.AnyAsync(s => s.StudentNumber == request.StudentNumber);
            if (exists)
                return Ok(ApiResponse.Fail("رقم الطالب مسجل مسبقاً"));
        }

        var student = new Student
        {
            StudentNumber = request.StudentNumber ?? "",
            Name = request.Name,
            Stage = stage,
            Grade = request.Grade ?? "",
            Class = ClassNumberToLetter(request.ClassName),
            Mobile = request.Mobile ?? "",
            CreatedAt = DateTime.UtcNow
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse.Ok("تم إضافة الطالب بنجاح"));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteStudent(int id)
    {
        var student = await _db.Students.FindAsync(id);
        if (student == null)
            return Ok(ApiResponse.Fail("الطالب غير موجود"));

        _db.Students.Remove(student);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse.Ok("تم حذف الطالب بنجاح"));
    }

    [HttpPost("import")]
    public async Task<ActionResult<ApiResponse>> ImportStudents([FromBody] ImportStudentsRequest request)
    {
        if (!Enum.TryParse<Stage>(request.Stage, true, out var stage))
            return Ok(ApiResponse.Fail("المرحلة غير صالحة"));

        int added = 0, updated = 0;

        foreach (var s in request.Students)
        {
            if (string.IsNullOrWhiteSpace(s.Name)) continue;

            Student? existing = null;
            if (!string.IsNullOrEmpty(s.StudentNumber))
                existing = await _db.Students.FirstOrDefaultAsync(x => x.StudentNumber == s.StudentNumber);

            if (existing != null)
            {
                existing.Name = s.Name;
                if (!string.IsNullOrEmpty(s.Grade)) existing.Grade = s.Grade;
                if (!string.IsNullOrEmpty(s.ClassName)) existing.Class = ClassNumberToLetter(s.ClassName);
                if (!string.IsNullOrEmpty(s.Mobile)) existing.Mobile = s.Mobile;
                existing.Stage = stage;
                updated++;
            }
            else
            {
                _db.Students.Add(new Student
                {
                    StudentNumber = s.StudentNumber ?? "",
                    Name = s.Name,
                    Stage = stage,
                    Grade = s.Grade ?? "",
                    Class = ClassNumberToLetter(s.ClassName),
                    Mobile = s.Mobile ?? "",
                    CreatedAt = DateTime.UtcNow
                });
                added++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(ApiResponse.Ok($"تم الاستيراد: {added} جديد، {updated} محدّث"));
    }

    // معاينة ملف Excel قبل الاستيراد — مطابق لـ processUploadedFile في Server_Settings.gs سطر 728-792
    [HttpPost("preview-excel")]
    public async Task<ActionResult<ApiResponse<object>>> PreviewExcel([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return Ok(ApiResponse.Fail("الملف مطلوب"));

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = FindBestWorksheet(workbook);

        var (colNumber, colName, colGrade, colClass, colMobile, headerRowNum) = DetectStudentColumns(ws);
        if (colName == 0)
            return Ok(ApiResponse.Fail("لم يتم العثور على عمود 'اسم الطالب' أو 'الاسم'"));

        // استخراج الرؤوس
        var headers = new List<string>();
        for (int c = 1; c <= Math.Min(30, ws.ColumnsUsed().Count()); c++)
        {
            headers.Add(ws.Row(headerRowNum).Cell(c).GetString().Trim());
        }

        // معاينة أول 10 صفوف
        var preview = new List<List<string>>();
        for (int r = headerRowNum; r <= Math.Min(headerRowNum + 10, ws.RowsUsed().Count()); r++)
        {
            var row = new List<string>();
            for (int c = 1; c <= headers.Count; c++)
            {
                row.Add(ws.Row(r).Cell(c).GetString().Trim());
            }
            preview.Add(row);
        }

        // عدد الصفوف الفعلية
        int totalRows = 0;
        for (int r = headerRowNum + 1; r <= ws.RowsUsed().Count(); r++)
        {
            var name = colName > 0 ? ws.Row(r).Cell(colName).GetString().Trim() : "";
            if (!string.IsNullOrWhiteSpace(name)) totalRows++;
        }

        // كشف التكرار مع الموجود
        var existingNumbers = await _db.Students
            .Where(s => !string.IsNullOrEmpty(s.StudentNumber))
            .Select(s => s.StudentNumber)
            .ToListAsync();
        var existingSet = new HashSet<string>(existingNumbers, StringComparer.Ordinal);

        // مطابق لـ processUploadedFile → columns object
        return Ok(ApiResponse<object>.Ok(new
        {
            headers,
            preview,
            totalRows,
            columns = new
            {
                studentId = colNumber > 0 ? colNumber - 1 : -1,
                name = colName > 0 ? colName - 1 : -1,
                grade = colGrade > 0 ? colGrade - 1 : -1,
                classVal = colClass > 0 ? colClass - 1 : -1,
                mobile = colMobile > 0 ? colMobile - 1 : -1,
            },
            existingCount = existingSet.Count
        }));
    }

    // استيراد من ملف Excel
    // ★ يدعم ClosedXML + fallback لقراءة XML مباشرة (ملفات نور بأنماط غير قياسية)
    [HttpPost("import-excel")]
    public async Task<ActionResult<ApiResponse>> ImportFromExcel(
        [FromForm] IFormFile file,
        [FromForm] string? stage = null)
    {
        if (file == null || file.Length == 0)
            return Ok(ApiResponse.Fail("الملف مطلوب"));

        Stage? stageEnum = null;
        if (!string.IsNullOrEmpty(stage) && Enum.TryParse<Stage>(stage, true, out var parsed))
            stageEnum = parsed;

        // ★ قراءة بيانات الورقة — XML مباشر أولاً (أدق، لا يفقد أعمدة)، ثم ClosedXML كـ fallback
        List<string[]> sheetRows;
        try
        {
            using var stream = file.OpenReadStream();
            sheetRows = ReadSheetViaRawXml(stream);
        }
        catch
        {
            // XML فشل — محاولة ClosedXML كـ fallback
            try
            {
                using var stream = file.OpenReadStream();
                sheetRows = ReadSheetViaClosedXml(stream);
            }
            catch (Exception ex)
            {
                return Ok(ApiResponse.Fail($"فشل قراءة الملف: {ex.Message}"));
            }
        }

        if (sheetRows.Count == 0)
            return Ok(ApiResponse.Fail("الملف فارغ أو لا يحتوي بيانات"));

        // ★ كشف الأعمدة من البيانات (1-indexed للتوافق مع FindCol)
        var (colNumber, colName, colGrade, colClass, colMobile, headerRowIdx) =
            DetectStudentColumnsFromRows(sheetRows);

        if (colName == 0)
            return Ok(ApiResponse.Fail("لم يتم العثور على عمود 'اسم الطالب' أو 'الاسم'"));

        // ★ استيراد البيانات
        int added = 0, updated = 0, skipped = 0;

        for (int r = headerRowIdx + 1; r < sheetRows.Count; r++)
        {
            var row = sheetRows[r];
            var name = SafeCell(row, colName);
            if (string.IsNullOrWhiteSpace(name)) { skipped++; continue; }

            var studentNumber = SafeCell(row, colNumber);
            var grade = SafeCell(row, colGrade);
            var className = SafeCell(row, colClass);
            var mobile = NormalizeMobile(SafeCell(row, colMobile));

            var rowStage = stageEnum ?? DetectStageFromGrade(grade);
            if (rowStage == null) { skipped++; continue; }

            grade = NormalizeGradeName(grade, rowStage);

            Student? existing = null;
            if (!string.IsNullOrEmpty(studentNumber))
                existing = await _db.Students.FirstOrDefaultAsync(s => s.StudentNumber == studentNumber);

            if (existing != null)
            {
                existing.Name = name;
                if (!string.IsNullOrEmpty(grade)) existing.Grade = grade;
                if (!string.IsNullOrEmpty(className)) existing.Class = ClassNumberToLetter(className);
                if (!string.IsNullOrEmpty(mobile)) existing.Mobile = mobile;
                existing.Stage = rowStage.Value;
                updated++;
            }
            else
            {
                _db.Students.Add(new Student
                {
                    StudentNumber = studentNumber,
                    Name = name,
                    Stage = rowStage.Value,
                    Grade = grade,
                    Class = ClassNumberToLetter(className),
                    Mobile = mobile,
                    CreatedAt = DateTime.UtcNow
                });
                added++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            added, updated, skipped,
            message = $"تم الاستيراد: {added} جديد، {updated} محدّث، {skipped} متجاوز"
        }));
    }

    // ★ قراءة آمنة لخلية — colIndex بنظام 1-indexed (0 = عمود غير موجود)
    private static string SafeCell(string[] row, int col1Based)
    {
        if (col1Based <= 0) return "";
        int idx = col1Based - 1;
        return idx < row.Length ? row[idx].Trim() : "";
    }

    // ★ قراءة الورقة عبر ClosedXML (للملفات القياسية)
    private static List<string[]> ReadSheetViaClosedXml(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var ws = FindBestWorksheet(workbook);
        var rows = new List<string[]>();
        int maxCol = Math.Min(30, ws.ColumnsUsed().Count());
        for (int r = 1; r <= ws.RowsUsed().Count(); r++)
        {
            var arr = new string[maxCol];
            for (int c = 0; c < maxCol; c++)
                arr[c] = ws.Row(r).Cell(c + 1).GetString().Trim();
            rows.Add(arr);
        }
        return rows;
    }

    // ★ قراءة الورقة عبر XML مباشر — fallback لملفات نور بأنماط تكسر ClosedXML
    // مطابق لمنهجية importStudentsFromExcel في v22 (Server_Settings.gs:836)
    private static List<string[]> ReadSheetViaRawXml(Stream stream)
    {
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        // 1. قراءة shared strings
        var shared = new List<string>();
        var ssEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (ssEntry != null)
        {
            using var ssStream = ssEntry.Open();
            var doc = XDocument.Load(ssStream);
            var ns = doc.Root!.Name.Namespace;
            foreach (var si in doc.Descendants(ns + "si"))
                shared.Add(string.Concat(si.Descendants(ns + "t").Select(t => t.Value)));
        }

        // 2. اختيار أفضل ورقة (Sheet2 لنور، ثم Sheet1)
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet2.xml")
                      ?? archive.GetEntry("xl/worksheets/sheet1.xml");
        if (sheetEntry == null) return new List<string[]>();

        // 3. تحليل بيانات الورقة
        using var sheetStream = sheetEntry.Open();
        var sheetDoc = XDocument.Load(sheetStream);
        var sns = sheetDoc.Root!.Name.Namespace;

        var tempRows = new List<Dictionary<int, string>>();
        int maxCol = 0;

        foreach (var row in sheetDoc.Descendants(sns + "row"))
        {
            var cells = new Dictionary<int, string>();
            foreach (var cell in row.Elements(sns + "c"))
            {
                var cellRef = cell.Attribute("r")?.Value ?? "";
                int colIdx = CellRefToColIndex(cellRef);
                var type = cell.Attribute("t")?.Value ?? "";
                var val = cell.Element(sns + "v")?.Value ?? "";

                if (type == "s" && int.TryParse(val, out var idx) && idx < shared.Count)
                    val = shared[idx];

                cells[colIdx] = val;
                if (colIdx >= maxCol) maxCol = colIdx + 1;
            }
            tempRows.Add(cells);
        }

        // 4. تحويل إلى مصفوفة string[]
        var result = new List<string[]>();
        foreach (var rowDict in tempRows)
        {
            var arr = new string[maxCol];
            for (int i = 0; i < maxCol; i++)
                arr[i] = rowDict.TryGetValue(i, out var v) ? v : "";
            result.Add(arr);
        }
        return result;
    }

    // تحويل مرجع الخلية (مثل "B5") إلى رقم العمود (0-indexed: B=1)
    private static int CellRefToColIndex(string cellRef)
    {
        int col = 0;
        foreach (var ch in cellRef)
        {
            if (char.IsLetter(ch))
                col = col * 26 + (char.ToUpper(ch) - 'A' + 1);
            else
                break;
        }
        return col - 1; // 0-indexed
    }

    // ★ كشف الأعمدة من مصفوفة بيانات (0-indexed داخلياً، يرجع 1-indexed للتوافق مع FindCol)
    private static (int colNumber, int colName, int colGrade, int colClass, int colMobile, int headerRow)
        DetectStudentColumnsFromRows(List<string[]> rows)
    {
        for (int r = 0; r < Math.Min(10, rows.Count); r++)
        {
            var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (int c = 0; c < rows[r].Length; c++)
            {
                // تنظيف المسافات المتعددة والمتكررة لتوحيد المقارنة
                var val = System.Text.RegularExpressions.Regex.Replace(rows[r][c].Trim(), @"\s+", " ");
                if (!string.IsNullOrEmpty(val))
                    colMap[val] = c + 1; // 1-indexed للتوافق مع FindCol
            }

            int cn = FindCol(colMap, "اسم الطالب", "الاسم", "Name", "اسم", "الإسم");
            if (cn > 0)
            {
                return (
                    // ★ لا نستخدم "رقم" العامة لأنها تطابق "رقم الصف" أيضاً
                    FindCol(colMap, "رقم الطالب", "الرقم", "StudentNumber", "رقم_الطالب"),
                    cn,
                    FindCol(colMap, "الصف", "Grade", "صف", "رقم الصف", "رقم صف"),
                    FindCol(colMap, "الفصل", "Class", "فصل"),
                    FindCol(colMap, "الجوال", "Mobile", "جوال", "رقم الجوال", "هاتف"),
                    r
                );
            }
        }

        // fallback: الصف الأول كرؤوس
        if (rows.Count > 0)
        {
            var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (int c = 0; c < rows[0].Length; c++)
            {
                var val = System.Text.RegularExpressions.Regex.Replace(rows[0][c].Trim(), @"\s+", " ");
                if (!string.IsNullOrEmpty(val))
                    colMap[val] = c + 1;
            }
            return (
                FindCol(colMap, "رقم الطالب", "الرقم", "StudentNumber", "رقم_الطالب"),
                FindCol(colMap, "اسم الطالب", "الاسم", "Name", "اسم"),
                FindCol(colMap, "الصف", "Grade", "صف"),
                FindCol(colMap, "الفصل", "Class", "فصل"),
                FindCol(colMap, "الجوال", "Mobile", "جوال", "رقم الجوال"),
                0
            );
        }
        return (0, 0, 0, 0, 0, 0);
    }

    // كشف المرحلة تلقائياً من اسم الصف
    private static Stage? DetectStageFromGrade(string grade)
    {
        if (string.IsNullOrEmpty(grade)) return null;
        if (grade.Contains("طفولة") || grade.Contains("روضة")) return Stage.Kindergarten;
        if (grade.Contains("ابتدائي") || grade.Contains("إبتدائي")) return Stage.Primary;
        if (grade.Contains("متوسط")) return Stage.Intermediate;
        if (grade.Contains("ثانوي")) return Stage.Secondary;
        return null;
    }

    // تطبيع اسم الصف إلى الصيغة الرسمية المطابقة لنظام نور
    // "الأول المتوسط_قسم عام" → "الأول المتوسط"
    // "أول ابتدائي" → "الأول الابتدائي"
    private static string NormalizeGradeName(string grade, Stage? stage)
    {
        if (string.IsNullOrEmpty(grade)) return grade;

        // إزالة اللاحقة مثل "_قسم عام"
        var underscoreIdx = grade.IndexOf('_');
        if (underscoreIdx > 0)
            grade = grade[..underscoreIdx].Trim();

        // الأرقام الترتيبية المعروفة (مع/بدون ال التعريف)
        string[] ordinals      = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
        string[] ordinalsBare  = ["أول",   "ثاني",   "ثالث",   "رابع",   "خامس",   "سادس"];

        int ordinalIdx = -1;
        for (int i = 0; i < ordinals.Length; i++)
        {
            if (grade.Contains(ordinals[i]) || grade.Contains(ordinalsBare[i]))
            { ordinalIdx = i; break; }
        }
        // دعم الأرقام الهندية/العربية "1"-"6"
        if (ordinalIdx < 0)
        {
            for (int i = 1; i <= 6; i++)
                if (grade.Contains(i.ToString()))
                { ordinalIdx = i - 1; break; }
        }

        if (ordinalIdx < 0) return grade.Trim(); // لم نتعرف على الرقم

        var ordinal = ordinals[ordinalIdx];
        var stageSuffix = stage switch
        {
            Stage.Primary      => "الابتدائي",
            Stage.Intermediate => "المتوسط",
            Stage.Secondary    => "الثانوي",
            Stage.Kindergarten => "طفولة مبكرة",
            _                  => ""
        };

        return string.IsNullOrEmpty(stageSuffix) ? grade.Trim() : $"{ordinal} {stageSuffix}";
    }

    // تحويل رقم الجوال من 966XXXXXXXXX إلى 05XXXXXXXX
    private static string NormalizeMobile(string mobile)
    {
        if (string.IsNullOrEmpty(mobile)) return mobile;
        mobile = mobile.Replace(" ", "").Replace("-", "");
        if (mobile.StartsWith("966") && mobile.Length == 12)
            mobile = "0" + mobile[3..];
        else if (mobile.StartsWith("+966") && mobile.Length == 13)
            mobile = "0" + mobile[4..];
        return mobile;
    }

    // البحث عن أفضل ورقة عمل (Sheet2 لنظام نور أو الأولى)
    private static IXLWorksheet FindBestWorksheet(XLWorkbook workbook)
    {
        if (workbook.Worksheets.Count > 1)
        {
            var sheet2 = workbook.Worksheets.Skip(1).First();
            if (sheet2.RowsUsed().Count() > 1)
                return sheet2;
        }
        return workbook.Worksheets.First();
    }

    // كشف الأعمدة تلقائياً مع البحث عن صف الرؤوس
    private static (int colNumber, int colName, int colGrade, int colClass, int colMobile, int headerRow) DetectStudentColumns(IXLWorksheet ws)
    {
        for (int r = 1; r <= Math.Min(10, ws.RowsUsed().Count()); r++)
        {
            var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var row = ws.Row(r);
            for (int c = 1; c <= Math.Min(30, ws.ColumnsUsed().Count()); c++)
            {
                var val = row.Cell(c).GetString().Trim();
                if (!string.IsNullOrEmpty(val))
                    colMap[val] = c;
            }

            int cn = FindCol(colMap, "اسم الطالب", "الاسم", "Name", "اسم", "الإسم");
            if (cn > 0)
            {
                return (
                    // ★ لا نستخدم "رقم" العامة لأنها تطابق "رقم الصف" أيضاً
                    FindCol(colMap, "رقم الطالب", "الرقم", "StudentNumber", "رقم_الطالب"),
                    cn,
                    FindCol(colMap, "الصف", "Grade", "صف", "رقم الصف", "رقم صف"),
                    FindCol(colMap, "الفصل", "Class", "فصل"),
                    FindCol(colMap, "الجوال", "Mobile", "جوال", "رقم الجوال", "هاتف"),
                    r
                );
            }
        }

        // fallback
        var fallbackMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var headerRow = ws.Row(1);
        for (int c = 1; c <= ws.ColumnsUsed().Count(); c++)
        {
            var val = headerRow.Cell(c).GetString().Trim();
            if (!string.IsNullOrEmpty(val))
                fallbackMap[val] = c;
        }

        return (
            FindCol(fallbackMap, "رقم الطالب", "الرقم", "StudentNumber", "رقم_الطالب"),
            FindCol(fallbackMap, "اسم الطالب", "الاسم", "Name", "اسم"),
            FindCol(fallbackMap, "الصف", "Grade", "صف"),
            FindCol(fallbackMap, "الفصل", "Class", "فصل"),
            FindCol(fallbackMap, "الجوال", "Mobile", "جوال", "رقم الجوال"),
            1
        );
    }

    private static int FindCol(Dictionary<string, int> map, params string[] names)
    {
        foreach (var n in names)
        {
            if (map.TryGetValue(n, out var col)) return col;
            var match = map.FirstOrDefault(kv => kv.Key.Contains(n) || n.Contains(kv.Key));
            if (match.Value > 0) return match.Value;
        }
        return 0;
    }

    // ★ تحويل رقم الفصل إلى حرف عربي (أبجد هوز حطي كلمن سعفص قرشت)
    private static readonly string[] _ClassLetters = { "أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي", "ك", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر" };

    private static string ClassNumberToLetter(string? className)
    {
        if (string.IsNullOrWhiteSpace(className)) return className ?? "";
        var trimmed = className.Trim();
        // إذا كان بالفعل حرف عربي، أعده كما هو
        if (_ClassLetters.Contains(trimmed)) return trimmed;
        // حاول تحويل الرقم
        if (int.TryParse(trimmed, out var num) && num >= 1 && num <= _ClassLetters.Length)
            return _ClassLetters[num - 1];
        return trimmed;
    }

    // ★ إصلاح أسماء الصفوف الناقصة: "الأول" → "الأول المتوسط" حسب المرحلة
    [HttpPost("fix-grade-names")]
    public async Task<ActionResult<ApiResponse<object>>> FixGradeNames()
    {
        var stageSuffix = new Dictionary<Stage, string>
        {
            { Stage.Kindergarten, " طفولة مبكرة" },
            { Stage.Primary, " الابتدائي" },
            { Stage.Intermediate, " المتوسط" },
            { Stage.Secondary, " الثانوي" },
        };
        var ordinals = new HashSet<string> { "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس" };
        var students = await _db.Students.IgnoreQueryFilters().ToListAsync();
        int fixedCount = 0;
        foreach (var s in students)
        {
            var g = s.Grade?.Trim() ?? "";
            // إذا الصف هو فقط الترتيب بدون اسم المرحلة
            if (ordinals.Contains(g) && stageSuffix.TryGetValue(s.Stage, out var suffix))
            {
                s.Grade = g + suffix;
                fixedCount++;
            }
        }
        if (fixedCount > 0) await _db.SaveChangesAsync();

        // إصلاح السجلات المرتبطة (التراكمي + اليومي)
        if (fixedCount > 0)
        {
            var fixedStudents = students.Where(s => ordinals.Contains(s.Grade?.Split(' ')[0] ?? "")).ToList();
            // لا حاجة — الطلاب أعلاه تم تعديلهم. نعدّل السجلات المرتبطة:
            foreach (var s in students.Where(st => stageSuffix.ContainsKey(st.Stage)))
            {
                var suffix2 = stageSuffix[s.Stage];
                var expectedGrade = s.Grade; // الآن صحيح بعد التعديل أعلاه

                // تحديث DailyAbsences
                var dailies = await _db.DailyAbsences.Where(d => d.StudentId == s.Id && !d.Grade.Contains(suffix2.Trim())).ToListAsync();
                foreach (var d in dailies) d.Grade = expectedGrade!;

                // تحديث CumulativeAbsences
                var cums = await _db.CumulativeAbsences.Where(c => c.StudentId == s.Id && !c.Grade.Contains(suffix2.Trim())).ToListAsync();
                foreach (var c in cums) c.Grade = expectedGrade!;
            }
            await _db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { fixedCount, message = $"تم تصحيح {fixedCount} صف" }));
    }

    // ★ إصلاح أرقام الفصول الموجودة في قاعدة البيانات → حروف عربية
    [HttpPost("fix-class-letters")]
    public async Task<ActionResult<ApiResponse<object>>> FixClassLetters()
    {
        var students = await _db.Students.ToListAsync();
        int fixedCount = 0;
        foreach (var s in students)
        {
            var converted = ClassNumberToLetter(s.Class);
            if (converted != s.Class)
            {
                s.Class = converted;
                fixedCount++;
            }
        }
        if (fixedCount > 0) await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { fixedCount, totalStudents = students.Count, message = $"تم تحويل {fixedCount} فصل من أرقام إلى حروف" }));
    }
}

public class StudentRequest
{
    public string? StudentNumber { get; set; }
    public string Name { get; set; } = "";
    public string? Stage { get; set; }
    public string? Grade { get; set; }
    public string? ClassName { get; set; }
    public string? Mobile { get; set; }
}

public class ImportStudentsRequest
{
    public string Stage { get; set; } = "";
    public List<StudentRequest> Students { get; set; } = new();
}
