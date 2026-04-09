using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _db;

    public AuthController(IAuthService authService, AppDbContext db)
    {
        _authService = authService;
        _db = db;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<object>>> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Mobile, request.Password);
        if (!result.Success)
            return Ok(ApiResponse<object>.Fail(result.Error!));

        return Ok(ApiResponse<object>.Ok(new
        {
            token = result.Token,
            user = new
            {
                id = result.User!.Id,
                name = result.User.Name,
                role = result.User.Role.ToString(),
                mobile = result.User.Mobile,
                scopeType = result.User.ScopeType,
                scopeValue = result.User.ScopeValue
            }
        }));
    }

    [HttpGet("token/{token}")]
    public async Task<ActionResult<ApiResponse<object>>> ValidateToken(string token)
    {
        var result = await _authService.ValidateTokenLinkAsync(token);
        if (!result.Success)
            return Ok(ApiResponse<object>.Fail(result.Error!));

        return Ok(ApiResponse<object>.Ok(new
        {
            token = result.Token,
            user = new
            {
                id = result.User!.Id,
                name = result.User.Name,
                role = result.User.Role.ToString(),
                mobile = result.User.Mobile
            }
        }));
    }
    // ── تغيير كلمة المرور ──
    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            return Ok(ApiResponse.Fail("كلمة المرور الحالية مطلوبة"));
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return Ok(ApiResponse.Fail("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"));

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return Ok(ApiResponse.Fail("المستخدم غير موجود"));

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return Ok(ApiResponse.Fail("كلمة المرور الحالية غير صحيحة"));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse.Ok("تم تغيير كلمة المرور بنجاح"));
    }
}

public class LoginRequest
{
    public string Mobile { get; set; } = "";
    public string Password { get; set; } = "";
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}
