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
builder.Services.AddScoped<ISemesterService, SemesterService>();
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
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("مفتاح JWT غير مُعيَّن. أضف Jwt:Key في appsettings.json أو متغيرات البيئة.");
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

// ★ Startup validation — placeholders must be changed before production deployment
if (!builder.Environment.IsDevelopment())
{
    if (jwtKey.Contains("CHANGE_THIS"))
        throw new InvalidOperationException("مفتاح JWT لا يزال بالقيمة الافتراضية. غيّره في appsettings.json قبل النشر.");
    var masterKeyVal = builder.Configuration["MasterKey"] ?? "";
    if (masterKeyVal.Contains("CHANGE_THIS"))
        throw new InvalidOperationException("مفتاح MasterKey لا يزال بالقيمة الافتراضية. غيّره في appsettings.json قبل النشر.");
}

var app = builder.Build();

// Auto-migrate database + seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // ★ Defensive schema upgrades — تعمل بأمان على DB جديد أو متقدم.
    //   نستخدم هذا بدل migration كاملة لأن الـ snapshot قد يكون متأخراً عن الكود.
    //   كل عبارة idempotent — ما تكسر شي لو تم تشغيلها مرتين.
    try
    {
        // إضافة UserId + FK إلى whatsapp_sessions (الإصلاح 5 — per-user deputy sessions).
        db.Database.ExecuteSqlRaw(@"
            SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                         WHERE TABLE_SCHEMA = DATABASE()
                         AND TABLE_NAME = 'whatsapp_sessions'
                         AND COLUMN_NAME = 'UserId');
            SET @stmt := IF(@col = 0,
                'ALTER TABLE whatsapp_sessions ADD COLUMN UserId INT NULL',
                'SELECT 1');
            PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;");

        db.Database.ExecuteSqlRaw(@"
            SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                         WHERE TABLE_SCHEMA = DATABASE()
                         AND TABLE_NAME = 'whatsapp_sessions'
                         AND INDEX_NAME = 'IX_whatsapp_sessions_UserId');
            SET @stmt := IF(@idx = 0,
                'CREATE INDEX IX_whatsapp_sessions_UserId ON whatsapp_sessions(UserId)',
                'SELECT 1');
            PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;");

        db.Database.ExecuteSqlRaw(@"
            SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'whatsapp_sessions'
                        AND CONSTRAINT_NAME = 'FK_whatsapp_sessions_users_UserId');
            SET @stmt := IF(@fk = 0,
                'ALTER TABLE whatsapp_sessions ADD CONSTRAINT FK_whatsapp_sessions_users_UserId
                 FOREIGN KEY (UserId) REFERENCES users(Id) ON DELETE CASCADE',
                'SELECT 1');
            PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;");
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("SchemaUpgrade");
        logger.LogWarning(ex, "Defensive schema upgrade failed (non-fatal)");
    }

    await DataSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact");

// معالج أخطاء عام — يلتقط أي استثناء غير مُعالج ويرجع JSON منظم
// ★ يجب أن يكون بعد UseCors حتى تحتوي استجابات 500 على ترويسات CORS
app.UseExceptionHandler(error =>
{
    error.Run(async context =>
    {
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalErrorHandler");
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        logger.LogError(exception, "خطأ غير مُعالج: {Path}", context.Request.Path);

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var response = SchoolBehaviorSystem.Application.DTOs.Responses.ApiResponse<object>.Fail("حدث خطأ في الخادم. يرجى المحاولة لاحقاً.");
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response));
    });
});
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
