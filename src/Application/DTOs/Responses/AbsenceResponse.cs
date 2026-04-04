namespace SchoolBehaviorSystem.Application.DTOs.Responses;

/// <summary>
/// Typed response DTO matching the anonymous projection in AbsenceController.GetAll.
/// Property names use PascalCase; the default System.Text.Json camelCase policy
/// produces the same JSON keys as the current anonymous objects.
/// </summary>
public class AbsenceResponse
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Grade { get; set; } = "";
    public string ClassName { get; set; } = "";
    public string Stage { get; set; } = "";
    public string Mobile { get; set; } = "";
    public string AbsenceType { get; set; } = "";
    public string Period { get; set; } = "";
    public string HijriDate { get; set; } = "";
    public string DayName { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public string Status { get; set; } = "";
    public string ExcuseType { get; set; } = "";
    public bool IsSent { get; set; }
    public string TardinessStatus { get; set; } = "";
    public string ArrivalTime { get; set; } = "";
    public string Notes { get; set; } = "";
    public string NoorStatus { get; set; } = "";
}
