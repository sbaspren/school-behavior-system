using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Infrastructure.Services;
using SchoolBehaviorSystem.Infrastructure.ExternalServices;
using SchoolBehaviorSystem.Infrastructure.Data;
using SchoolBehaviorSystem.API.Hubs;
using SchoolBehaviorSystem.API.Middleware;
using SchoolBehaviorSystem.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Database - MariaDB
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Port=3306;Database=school_behavior;User=root;Password=;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString,
        ServerVersion.Create(10, 6, 0, Pomelo.EntityFrameworkCore.MySql.Infrastructure.ServerType.MariaDb)));

// Cache
builder.Services.AddMemoryCache();

// Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<ISchoolConfigService, SchoolConfigService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IHijriDateService, HijriDateService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddHttpClient<IWhatsAppServerService, WhatsAppServerService>();
builder.Services.AddHttpClient<ISmsService, SmsService>();

// SignalR — real-time notifications
builder.Services.AddSignalR();
builder.Services.AddScoped<NotificationService>();

// Background Services — مطابق لـ setupDailyBakeTrigger() في Server_TeacherInput.gs سطر 185-203
builder.Services.AddHostedService<TeacherDataBakeService>();
// ★ ترحيل الغياب اليومي — مطابق لـ archiveDailyAbsence() + createArchiveTrigger() في Server_Absence_Daily.gs
builder.Services.AddHostedService<AbsenceArchiveService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SchoolBehaviorSystemDefaultKey2024!@#$%";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "SchoolBehaviorSystem",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "SchoolBehaviorSystem",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Controllers — enums ترجع كنصوص (مثل "Boys", "Image") بدل أرقام
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS - for React dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Auto-migrate database + seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DataSeeder.SeedAsync(db);

    // ★ إصلاح تلقائي: تحويل أرقام الفصول إلى حروف عربية (أ، ب، ج...)
    var classLetters = new[] { "أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي", "ك", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر" };
    var students = db.Students.Where(s => s.Class != null && s.Class.Length <= 2).ToList();
    int fixed = 0;
    foreach (var s in students)
    {
        if (int.TryParse(s.Class, out var num) && num >= 1 && num <= classLetters.Length)
        {
            s.Class = classLetters[num - 1];
            fixed++;
        }
    }
    if (fixed > 0)
    {
        db.SaveChanges();
        Console.WriteLine($"★ تم تحويل {fixed} فصل من أرقام إلى حروف عربية");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<LicenseMiddleware>();

// Serve React build (wwwroot)
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<NotificationHub>("/hub/notifications");

// SPA fallback: any non-API route → index.html
app.MapFallbackToFile("index.html");

app.Run();
