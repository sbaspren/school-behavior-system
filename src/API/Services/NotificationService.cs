using Microsoft.AspNetCore.SignalR;
using SchoolBehaviorSystem.API.Hubs;

namespace SchoolBehaviorSystem.API.Services;

public class NotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendAsync(string type, object data)
    {
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", new { type, data, timestamp = DateTime.UtcNow });
    }

    public async Task SendNewViolationAsync(string studentName, string violation, int degree)
    {
        await SendAsync("violation", new { studentName, violation, degree });
    }

    public async Task SendNewAbsenceAsync(string studentName, string className)
    {
        await SendAsync("absence", new { studentName, className });
    }

    public async Task SendNewPermissionAsync(string studentName, string reason)
    {
        await SendAsync("permission", new { studentName, reason });
    }

    public async Task SendNewTardinessAsync(string studentName, int minutes)
    {
        await SendAsync("tardiness", new { studentName, minutes });
    }

    public async Task SendNewExcuseAsync(string studentName, string excuseText)
    {
        await SendAsync("excuse", new { studentName, excuseText });
    }

    public async Task SendRefreshDashboardAsync()
    {
        await SendAsync("refresh", new { });
    }
}
