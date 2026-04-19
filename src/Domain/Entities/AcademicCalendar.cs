namespace SchoolBehaviorSystem.Domain.Entities;

// تقويم أكاديمي عام (لا يرتبط بمدرسة محددة — بدون TenantId)
public class AcademicCalendar
{
    public int Id { get; set; }
    public string AcademicYear { get; set; } = "";
    public string Label { get; set; } = "";
    public DateTime Semester1Start { get; set; }
    public DateTime Semester1End { get; set; }
    public DateTime Semester2Start { get; set; }
    public DateTime Semester2End { get; set; }
    public int BufferDays { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
