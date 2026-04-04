namespace SchoolBehaviorSystem.Application.DTOs.Responses;

/// <summary>
/// Typed response DTO matching the anonymous projection in ViolationsController.GetViolations.
/// Property names use PascalCase; the default System.Text.Json camelCase policy
/// produces the same JSON keys as the current anonymous objects.
/// </summary>
public class ViolationResponse
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Grade { get; set; } = "";
    public string ClassName { get; set; } = "";
    public string Stage { get; set; } = "";
    public string ViolationCode { get; set; } = "";
    public string Description { get; set; } = "";
    public string Type { get; set; } = "";
    public int Degree { get; set; }
    public string HijriDate { get; set; } = "";
    public string MiladiDate { get; set; } = "";
    public double Deduction { get; set; }
    public string Procedures { get; set; } = "";
    public string Forms { get; set; } = "";
    public string DayName { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public bool IsSent { get; set; }
    public string Notes { get; set; } = "";
}
