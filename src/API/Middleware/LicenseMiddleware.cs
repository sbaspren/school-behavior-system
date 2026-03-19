using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using System.Text.Json;

namespace SchoolBehaviorSystem.API.Middleware;

/// <summary>
/// يتحقق من صلاحية الاشتراك في كل طلب API (ما عدا المسارات العامة).
/// إذا انتهى الاشتراك → يرجع 403 مع رسالة واضحة.
/// </summary>
public class LicenseMiddleware
{
    private readonly RequestDelegate _next;

    // مسارات لا تحتاج اشتراك فعّال
    private static readonly string[] ExcludedPaths =
    {
        "/api/licenses/check-setup",
        "/api/licenses/activate",
        "/api/licenses/status",
        "/api/auth/login",
        "/api/auth/token/"
    };

    public LicenseMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantService tenantService)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // تخطي المسارات العامة + الملفات الثابتة + Swagger
        if (!path.StartsWith("/api/") || IsExcludedPath(path))
        {
            await _next(context);
            return;
        }

        // تخطي Master Key endpoints (المطور)
        if (context.Request.Headers.ContainsKey("X-Master-Key"))
        {
            await _next(context);
            return;
        }

        // التحقق من الاشتراك
        var isActive = await tenantService.IsSubscriptionActiveAsync();
        if (!isActive)
        {
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            var response = ApiResponse<object>.Fail("انتهى اشتراكك. يرجى تجديد الاشتراك للمتابعة.");
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            return;
        }

        await _next(context);
    }

    private static bool IsExcludedPath(string path)
    {
        foreach (var excluded in ExcludedPaths)
        {
            if (path.StartsWith(excluded))
                return true;
        }
        return false;
    }
}
