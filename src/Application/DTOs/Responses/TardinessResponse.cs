namespace SchoolBehaviorSystem.Application.DTOs.Responses;

/// <summary>
/// Typed response DTO matching the anonymous projection in TardinessController.GetAll.
/// Property names use PascalCase; the default System.Text.Json camelCase policy
/// produces the same JSON keys as the current anonymous objects.
/// </summary>
public class TardinessResponse
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Grade { get; set; } = "";
    public string ClassName { get; set; } = "";
    public string Stage { get; set; } = "";
    public string Mobile { get; set; } = "";
    public string TardinessType { get; set; } = "";
    public string Period { get; set; } = "";
    public string HijriDate { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public bool IsSent { get; set; }
}
