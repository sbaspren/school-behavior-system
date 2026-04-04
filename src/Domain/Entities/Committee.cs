using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class Committee : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string Name { get; set; } = "";
    public string CommitteeType { get; set; } = "";    // Discipline / Guidance / Academic
    public string Members { get; set; } = "";           // legacy comma-separated (kept for backward compat)
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<CommitteeMember> MembersList { get; set; } = new List<CommitteeMember>();
    public ICollection<CommitteeMeeting> Meetings { get; set; } = new List<CommitteeMeeting>();
}
