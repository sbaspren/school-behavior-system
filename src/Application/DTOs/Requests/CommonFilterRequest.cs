namespace SchoolBehaviorSystem.Application.DTOs.Requests;

/// <summary>
/// Shared filter parameters used across Violations, Absence, Tardiness, and Permissions controllers.
/// Captures the common [FromQuery] parameters seen in each controller's GetAll endpoint.
/// </summary>
public class CommonFilterRequest
{
    public string? Stage { get; set; }
    public string? Grade { get; set; }
    public string? ClassName { get; set; }
    public int? StudentId { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public bool? IsSent { get; set; }
    public string? Search { get; set; }
}
