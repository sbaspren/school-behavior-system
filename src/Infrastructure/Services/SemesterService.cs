using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.Infrastructure.Services;

/// <summary>
/// يحدد الفصل الدراسي الحالي والسنة الأكاديمية.
/// المصدر الأساسي: إعدادات المدرسة (SchoolSettings).
/// الاحتياطي: يحسب من التقويم الهجري تلقائياً.
///
/// منطق الاحتياط:
///   - الشهور 1-6 هجري → الفصل الثاني من السنة السابقة
///   - الشهور 7-12 هجري → الفصل الأول من السنة الحالية
/// </summary>
public class SemesterService : ISemesterService
{
    private readonly AppDbContext _db;
    private readonly IHijriDateService _hijri;

    // كاش لكل request (Scoped lifetime)
    private (int Semester, string AcademicYear)? _cached;

    public SemesterService(AppDbContext db, IHijriDateService hijri)
    {
        _db = db;
        _hijri = hijri;
    }

    public async Task<(int Semester, string AcademicYear)> GetCurrentAsync()
    {
        if (_cached.HasValue) return _cached.Value;

        var settings = await _db.SchoolSettings.FirstOrDefaultAsync();

        if (settings != null
            && settings.CurrentSemester is 1 or 2
            && !string.IsNullOrEmpty(settings.CurrentAcademicYear))
        {
            _cached = (settings.CurrentSemester, settings.CurrentAcademicYear);
            return _cached.Value;
        }

        // ── احتياطي: حساب من التقويم الهجري ──
        var hijriFull = _hijri.GetHijriDateFull();
        int semester = hijriFull.HijriMonthNum <= 6 ? 2 : 1;
        string year = hijriFull.HijriMonthNum <= 6
            ? (hijriFull.HijriYear - 1).ToString()
            : hijriFull.HijriYear.ToString();

        _cached = (semester, year);
        return _cached.Value;
    }

    public async Task<int> GetCurrentSemesterAsync()
    {
        var (semester, _) = await GetCurrentAsync();
        return semester;
    }

    public async Task<string> GetCurrentAcademicYearAsync()
    {
        var (_, year) = await GetCurrentAsync();
        return year;
    }
}
