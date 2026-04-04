using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CommitteeController : ControllerBase
{
    private readonly AppDbContext _db;

    public CommitteeController(AppDbContext db) => _db = db;

    // ── GET /api/committee ──
    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var committees = await _db.Committees
            .Include(c => c.MembersList.OrderBy(m => m.SortOrder))
            .Include(c => c.Meetings.OrderByDescending(m => m.MeetingNumber))
            .Where(c => c.IsActive)
            .OrderBy(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.CommitteeType,
                MembersCount = c.MembersList.Count,
                MeetingsCount = c.Meetings.Count,
                LastMeeting = c.Meetings.OrderByDescending(m => m.MeetingNumber).Select(m => new { m.MeetingNumber, m.HijriDate }).FirstOrDefault(),
                Members = c.MembersList.OrderBy(m => m.SortOrder).Select(m => new
                {
                    m.Id,
                    m.PersonName,
                    m.PersonRole,
                    m.JobTitle,
                    m.SortOrder
                })
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(committees));
    }

    // ── GET /api/committee/{id} ──
    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
        var committee = await _db.Committees
            .Include(c => c.MembersList.OrderBy(m => m.SortOrder))
            .Include(c => c.Meetings.OrderByDescending(m => m.MeetingNumber))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (committee == null) return NotFound(ApiResponse.Fail("اللجنة غير موجودة"));

        return Ok(ApiResponse<object>.Ok(new
        {
            committee.Id,
            committee.Name,
            committee.CommitteeType,
            Members = committee.MembersList.OrderBy(m => m.SortOrder).Select(m => new
            {
                m.Id, m.PersonName, m.PersonRole, m.JobTitle, m.SortOrder
            }),
            Meetings = committee.Meetings.OrderByDescending(m => m.MeetingNumber).Select(m => new
            {
                m.Id, m.MeetingNumber, m.HijriDate, m.DayName, m.Status,
                m.StartTime, m.EndTime, m.Location,
                m.GoalsJson, m.AgendaJson, m.DecisionsJson, m.Notes,
                m.CreatedAt
            })
        }));
    }

    // ── PUT /api/committee/{id}/members ──
    [HttpPut("{id}/members")]
    public async Task<ActionResult> UpdateMembers(int id, [FromBody] UpdateMembersRequest request)
    {
        var committee = await _db.Committees.Include(c => c.MembersList).FirstOrDefaultAsync(c => c.Id == id);
        if (committee == null) return NotFound(ApiResponse.Fail("اللجنة غير موجودة"));

        // Remove existing members and replace
        _db.CommitteeMembers.RemoveRange(committee.MembersList);

        for (int i = 0; i < request.Members.Count; i++)
        {
            var m = request.Members[i];
            committee.MembersList.Add(new CommitteeMember
            {
                PersonName = m.PersonName?.Trim() ?? "",
                PersonRole = m.PersonRole?.Trim() ?? "عضو",
                JobTitle = m.JobTitle?.Trim() ?? "",
                SortOrder = i
            });
        }

        // Also update legacy comma-separated field
        committee.Members = string.Join(",", request.Members.Select(m => m.PersonName?.Trim()));

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث الأعضاء"));
    }

    // ── GET /api/committee/{id}/meetings ──
    [HttpGet("{id}/meetings")]
    public async Task<ActionResult> GetMeetings(int id)
    {
        var meetings = await _db.CommitteeMeetings
            .Where(m => m.CommitteeId == id)
            .OrderByDescending(m => m.MeetingNumber)
            .Select(m => new
            {
                m.Id, m.MeetingNumber, m.HijriDate, m.MeetingDate, m.DayName,
                m.StartTime, m.EndTime, m.Location, m.Status,
                m.GoalsJson, m.AgendaJson, m.DecisionsJson, m.Notes,
                m.CreatedAt, m.UpdatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(meetings));
    }

    // ── POST /api/committee/{id}/meetings ──
    [HttpPost("{id}/meetings")]
    public async Task<ActionResult> CreateMeeting(int id, [FromBody] MeetingRequest request)
    {
        var committee = await _db.Committees.FindAsync(id);
        if (committee == null) return NotFound(ApiResponse.Fail("اللجنة غير موجودة"));

        var meeting = new CommitteeMeeting
        {
            CommitteeId = id,
            MeetingNumber = request.MeetingNumber,
            MeetingDate = request.MeetingDate ?? "",
            HijriDate = request.HijriDate ?? "",
            DayName = request.DayName ?? "",
            StartTime = request.StartTime ?? "",
            EndTime = request.EndTime ?? "",
            Location = request.Location ?? "المدرسة",
            GoalsJson = request.GoalsJson ?? "[]",
            AgendaJson = request.AgendaJson ?? "[]",
            DecisionsJson = request.DecisionsJson ?? "[]",
            Notes = request.Notes ?? "",
            Status = request.Status ?? "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.CommitteeMeetings.Add(meeting);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { meeting.Id }, "تم إنشاء الاجتماع"));
    }

    // ── PUT /api/committee/{id}/meetings/{mid} ──
    [HttpPut("{id}/meetings/{mid}")]
    public async Task<ActionResult> UpdateMeeting(int id, int mid, [FromBody] MeetingRequest request)
    {
        var meeting = await _db.CommitteeMeetings.FirstOrDefaultAsync(m => m.Id == mid && m.CommitteeId == id);
        if (meeting == null) return NotFound(ApiResponse.Fail("الاجتماع غير موجود"));

        meeting.MeetingNumber = request.MeetingNumber;
        meeting.MeetingDate = request.MeetingDate ?? meeting.MeetingDate;
        meeting.HijriDate = request.HijriDate ?? meeting.HijriDate;
        meeting.DayName = request.DayName ?? meeting.DayName;
        meeting.StartTime = request.StartTime ?? meeting.StartTime;
        meeting.EndTime = request.EndTime ?? meeting.EndTime;
        meeting.Location = request.Location ?? meeting.Location;
        meeting.GoalsJson = request.GoalsJson ?? meeting.GoalsJson;
        meeting.AgendaJson = request.AgendaJson ?? meeting.AgendaJson;
        meeting.DecisionsJson = request.DecisionsJson ?? meeting.DecisionsJson;
        meeting.Notes = request.Notes ?? meeting.Notes;
        meeting.Status = request.Status ?? meeting.Status;
        meeting.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث الاجتماع"));
    }

    // ── DELETE /api/committee/{id}/meetings/{mid} ──
    [HttpDelete("{id}/meetings/{mid}")]
    public async Task<ActionResult> DeleteMeeting(int id, int mid)
    {
        var meeting = await _db.CommitteeMeetings.FirstOrDefaultAsync(m => m.Id == mid && m.CommitteeId == id);
        if (meeting == null) return NotFound(ApiResponse.Fail("الاجتماع غير موجود"));

        _db.CommitteeMeetings.Remove(meeting);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم حذف الاجتماع"));
    }
}

// ── Request DTOs ──

public class UpdateMembersRequest
{
    public List<MemberDto> Members { get; set; } = new();
}

public class MemberDto
{
    public string? PersonName { get; set; }
    public string? PersonRole { get; set; }
    public string? JobTitle { get; set; }
}

public class MeetingRequest
{
    public int MeetingNumber { get; set; }
    public string? MeetingDate { get; set; }
    public string? HijriDate { get; set; }
    public string? DayName { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public string? Location { get; set; }
    public string? GoalsJson { get; set; }
    public string? AgendaJson { get; set; }
    public string? DecisionsJson { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
}
