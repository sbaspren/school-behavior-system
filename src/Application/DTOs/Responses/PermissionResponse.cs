namespace SchoolBehaviorSystem.Application.DTOs.Responses;

/// <summary>
/// Typed response DTO matching the anonymous projection in PermissionsController.GetAll.
/// Property names use PascalCase; the default System.Text.Json camelCase policy
/// produces the same JSON keys as the current anonymous objects.
/// </summary>
public class PermissionResponse
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Grade { get; set; } = "";
    public string ClassName { get; set; } = "";
    public string Stage { get; set; } = "";
    public string Mobile { get; set; } = "";
    public string ExitTime { get; set; } = "";
    public string Reason { get; set; } = "";
    public string Receiver { get; set; } = "";
    public string Supervisor { get; set; } = "";
    public string HijriDate { get; set; } = "";
    public string RecordedBy { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public string? ConfirmationTime { get; set; }
    public bool IsSent { get; set; }
}
