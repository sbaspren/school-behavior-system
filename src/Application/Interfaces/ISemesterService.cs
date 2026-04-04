namespace SchoolBehaviorSystem.Application.Interfaces;

/// <summary>
/// خدمة الفصل الدراسي — تحدد الفصل الحالي والسنة الأكاديمية من إعدادات المدرسة.
/// إذا لم تُحدد الإعدادات، يُحسب تلقائياً من التقويم الهجري.
/// </summary>
public interface ISemesterService
{
    /// <summary>الفصل الحالي (1 أو 2)</summary>
    Task<int> GetCurrentSemesterAsync();

    /// <summary>السنة الهجرية الحالية مثل "1447"</summary>
    Task<string> GetCurrentAcademicYearAsync();

    /// <summary>يرجع الفصل + السنة معاً</summary>
    Task<(int Semester, string AcademicYear)> GetCurrentAsync();
}
