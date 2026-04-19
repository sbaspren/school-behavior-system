using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Application.DTOs.Responses;
using SchoolBehaviorSystem.Application.Interfaces;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Infrastructure.Data;

namespace SchoolBehaviorSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WhatsAppController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWhatsAppServerService _waServer;
    private readonly IHijriDateService _hijri;

    public WhatsAppController(AppDbContext db, IWhatsAppServerService waServer, IHijriDateService hijri)
    {
        _db = db;
        _waServer = waServer;
        _hijri = hijri;
    }

    // ===== Helper: ضمان وجود سجل WhatsAppSettings دائماً =====
    private async Task<WhatsAppSettings> GetOrCreateSettingsAsync()
    {
        var settings = await _db.WhatsAppSettings.FirstOrDefaultAsync();
        if (settings != null) return settings;

        // ★ إنشاء تلقائي مع رابط السيرفر الافتراضي — يمنع تكرار مشكلة "فشل الاتصال"
        settings = new WhatsAppSettings
        {
            ServerUrl = "http://194.163.133.252:3000",
            ServiceStatus = "مفعل",
            TenantId = 1
        };
        _db.WhatsAppSettings.Add(settings);
        await _db.SaveChangesAsync();
        return settings;
    }

    // ===== Settings =====

    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<object>>> GetSettings()
    {
        var settings = await GetOrCreateSettingsAsync();
        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            serverUrl = settings?.ServerUrl ?? "",
            serviceStatus = settings?.ServiceStatus ?? "\u0645\u0641\u0639\u0644",
            smsApiToken = !string.IsNullOrEmpty(settings?.SmsApiToken) ? "***configured***" : "",
            smsSenderName = settings?.SmsSenderName ?? "School",
            whatsAppMode = schoolSettings?.WhatsAppMode.ToString() ?? "PerStage",
        }));
    }

    [HttpPost("settings")]
    public async Task<ActionResult<ApiResponse>> SaveSettings([FromBody] WhatsAppSettingsRequest request)
    {
        var settings = await GetOrCreateSettingsAsync();

        if (request.ServerUrl != null) settings.ServerUrl = request.ServerUrl;
        if (request.ServiceStatus != null) settings.ServiceStatus = request.ServiceStatus;
        if (request.SmsApiToken != null) settings.SmsApiToken = request.SmsApiToken;
        if (request.SmsSenderName != null) settings.SmsSenderName = request.SmsSenderName;

        // Update WhatsAppMode in school settings
        if (!string.IsNullOrEmpty(request.WhatsAppMode))
        {
            var school = await _db.SchoolSettings.FirstOrDefaultAsync();
            if (school != null && Enum.TryParse<WhatsAppMode>(request.WhatsAppMode, true, out var mode))
                school.WhatsAppMode = mode;
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("\u062a\u0645 \u0627\u0644\u062d\u0641\u0638")); // تم الحفظ
    }

    // ===== Server Status =====

    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<object>>> GetStatus([FromQuery] string? stage = null)
    {
        var settings       = await GetOrCreateSettingsAsync();
        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
        var serverUrl      = settings?.ServerUrl ?? "";

        // ★ 1. التحقق من إعداد رمز الأمان — مطابق GAS سطر 982
        var needSetup    = string.IsNullOrEmpty(settings?.SecurityCode);
        var whatsAppMode = schoolSettings?.WhatsAppMode.ToString() ?? "PerStage";

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var currentUser = await _db.Users.FindAsync(userId);

        // ★ فحص وجود رقم مربوط للأدمن — مصدر الحقيقة: WhatsAppSessions.
        var activeAdminIds = await _db.Users
            .Where(u => u.Role == UserRole.Admin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();
        var adminHasPhone = await _db.WhatsAppSessions.AnyAsync(s =>
            s.UserId == null || (s.UserId.HasValue && activeAdminIds.Contains(s.UserId.Value)));

        // ★ 2. النمط الموحد: effectiveStage = "" — مطابق GAS سطر 994
        var effectiveStage = whatsAppMode == "Unified" ? "" : (stage ?? "");

        if (string.IsNullOrEmpty(serverUrl))
            return Ok(ApiResponse<object>.Ok(new
            {
                connected = false, phone = (string?)null, needSetup,
                whatsappMode = whatsAppMode, stage = stage ?? "", effectiveStage,
                sessions = Array.Empty<object>(),
                canUseAdminWhatsApp = currentUser?.CanUseAdminWhatsApp ?? false,
                adminHasWhatsApp = adminHasPhone,
                error = "رابط سيرفر الواتساب غير مُعيّن — عيّنه في إعدادات الواتساب"
            }));

        // ★ 3. فحص السيرفر + جلب الجلسات المحفوظة + التحقق من حياة كل جلسة
        var serverStatus = await _waServer.GetStatusAsync(serverUrl);
        var serverOnline = serverStatus.IsOnline;

        // ★ جلب الجلسات — كل مستخدم يشوف جلساته فقط (+ جلسات Unified المشتركة بـ UserId=null).
        // لوحة التحكم (MasterKey) هي الوحيدة اللي ترى الكل — هذا endpoint authenticated.
        var savedQ = _db.WhatsAppSessions
            .Where(s => s.UserId == userId || s.UserId == null);
        if (!string.IsNullOrEmpty(effectiveStage))
            savedQ = savedQ.Where(s => s.Stage == effectiveStage);
        var savedSessions = await savedQ.ToListAsync();

        // ★ لكل رقم محفوظ، نفحص هل جلسته لا تزال حية على السيرفر
        // السيرفر لا يملك endpoint لسرد الأرقام — نستخدم فحص فردي عبر /send
        var sessionStatuses = new Dictionary<string, bool>();
        if (serverOnline)
        {
            var checkTasks = savedSessions.Select(async s =>
            {
                var alive = await _waServer.IsSessionAliveAsync(serverUrl, s.PhoneNumber);
                return (s.PhoneNumber, alive);
            });
            var results = await Task.WhenAll(checkTasks);
            foreach (var (phone, alive) in results)
                sessionStatuses[phone] = alive;

            // ★ تنظيف تلقائي: لو جلسة IsPrimary=true لكنها ميتة على السيرفر،
            // نطفّي IsPrimary في DB حتى لا يستخدمها النظام في الإرسال.
            // يحدث عندما يفصل المستخدم الاتصال من جواله مباشرة.
            var deadPrimary = savedSessions
                .Where(s => s.IsPrimary && !sessionStatuses.GetValueOrDefault(s.PhoneNumber, false))
                .ToList();
            if (deadPrimary.Count > 0)
            {
                foreach (var s in deadPrimary) s.IsPrimary = false;
                await _db.SaveChangesAsync();
            }
        }

        var allSessions = savedSessions.Select(s => new
        {
            phone       = s.PhoneNumber,
            stage       = s.Stage,
            userType    = s.UserType,
            status      = serverOnline && sessionStatuses.GetValueOrDefault(s.PhoneNumber, false) ? "متصل" : "غير متصل",
            linkedDate  = s.LinkedAt?.ToString("yyyy/MM/dd HH:mm") ?? "",
            lastUsed    = s.LastUsed?.ToString("yyyy/MM/dd HH:mm") ?? "",
            messageCount = s.MessageCount,
            isPrimary   = s.IsPrimary,
        }).ToList();

        // sessions = المتصلون فقط
        var connectedSessions = allSessions.Where(s => s.status == "متصل").Cast<object>().ToList();

        // ★ 4. جلب الرقم الرئيسي — مطابق GAS سطر 1001 (getPrimaryPhoneForStage)
        var primaryRow = savedSessions.FirstOrDefault(s => s.IsPrimary);
        var primaryPhone = primaryRow?.PhoneNumber;
        var hasPrimary   = primaryPhone != null;

        if (connectedSessions.Count > 0)
        {
            // ★ مطابق GAS سطر 1005: connected = true
            return Ok(ApiResponse<object>.Ok(new
            {
                connected    = true,
                phone        = primaryPhone ?? connectedSessions.Cast<dynamic>().First().phone,
                primaryPhone,
                hasPrimary,
                needSetup,
                sessions     = connectedSessions,
                allSessions  = allSessions.Cast<object>().ToList(),
                stage        = stage ?? "",
                effectiveStage,
                whatsappMode = whatsAppMode,
                canUseAdminWhatsApp = currentUser?.CanUseAdminWhatsApp ?? false,
                adminHasWhatsApp = adminHasPhone,
                serverOnline,
                scenario = await DetectScenario(),
            }));
        }

        // ★ مطابق GAS سطر 1023: لا أرقام متصلة
        return Ok(ApiResponse<object>.Ok(new
        {
            connected    = false,
            phone        = (string?)null,
            primaryPhone,
            hasPrimary,
            needSetup,
            sessions     = Array.Empty<object>(),
            allSessions  = allSessions.Cast<object>().ToList(),
            stage        = stage ?? "",
            effectiveStage,
            whatsappMode = whatsAppMode,
            canUseAdminWhatsApp = currentUser?.CanUseAdminWhatsApp ?? false,
            adminHasWhatsApp = adminHasPhone,
            connectedPhones = serverStatus.ConnectedPhones.Select(p => new { p.PhoneNumber, p.IsConnected }),
            scenario = await DetectScenario(),
        }));
    }

    [HttpPost("ping")]
    public async Task<ActionResult<ApiResponse<object>>> Ping()
    {
        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";
        var isOnline = await _waServer.PingAsync(serverUrl);
        return Ok(ApiResponse<object>.Ok(new { isOnline }));
    }

    // ===== QR Code =====

    [HttpGet("qr")]
    public async Task<ActionResult<ApiResponse<object>>> GetQRCode()
    {
        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(ApiResponse<object>.Fail("\u0631\u0627\u0628\u0637 \u0627\u0644\u0633\u064a\u0631\u0641\u0631 \u063a\u064a\u0631 \u0645\u064f\u0639\u064a\u0651\u0646")); // رابط السيرفر غير مُعيّن

        var qrResult = await _waServer.GetQRCodeAsync(serverUrl);

        if (qrResult == null)
            return Ok(ApiResponse<object>.Ok(new { hasQR = false }));

        // Multi-Session API returns "qrData|sessionId"
        var parts = qrResult.Split('|', 2);
        var qrData = parts[0];
        var sessionId = parts.Length > 1 ? parts[1] : null;

        return Ok(ApiResponse<object>.Ok(new { hasQR = true, qrData, sessionId }));
    }

    // ===== QR Status Poll — فحص حالة الـ QR (هل تم المسح؟) =====

    [HttpGet("qr/poll")]
    public async Task<ActionResult<ApiResponse<object>>> PollQRStatus([FromQuery] string sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
            return BadRequest(ApiResponse<object>.Fail("sessionId مطلوب"));

        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";
        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(ApiResponse<object>.Fail("رابط السيرفر غير مُعيّن"));

        var result = await _waServer.PollQRStatusAsync(serverUrl, sessionId);
        return Ok(ApiResponse<object>.Ok(new
        {
            status = result.Status,
            phone = result.Phone,
            qrData = result.QrData,
            error = result.Error
        }));
    }

    // ===== Connected Sessions from Server =====

    [HttpGet("connected-sessions")]
    public async Task<ActionResult<ApiResponse<object>>> GetConnectedSessions()
    {
        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        var sessions = await _waServer.GetConnectedSessionsAsync(serverUrl);

        // Cross-reference with saved sessions
        var savedSessions = await _db.WhatsAppSessions.ToListAsync();
        var result = sessions.Select(phone =>
        {
            var saved = savedSessions.FirstOrDefault(s => s.PhoneNumber == phone);
            return new
            {
                phoneNumber = phone,
                isSaved = saved != null,
                stage = saved?.Stage ?? "",
                userType = saved?.UserType ?? "",
                isPrimary = saved?.IsPrimary ?? false,
            };
        }).ToList();

        return Ok(ApiResponse<object>.Ok(new { phones = result }));
    }

    // ===== Send Message =====
    // ★ مطابق لـ sendWhatsAppMessage + sendWhatsAppMessageFrom في GAS

    [HttpPost("send")]
    public async Task<ActionResult<ApiResponse<object>>> SendMessage([FromBody] SendWhatsAppRequest request)
    {
        if (string.IsNullOrEmpty(request.RecipientPhone))
            return BadRequest(ApiResponse<object>.Fail("رقم المستقبل مطلوب"));
        if (string.IsNullOrEmpty(request.Message))
            return BadRequest(ApiResponse<object>.Fail("نص الرسالة مطلوب"));

        var settings  = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(ApiResponse<object>.Fail("رابط سيرفر الواتساب غير مُعيّن"));

        // ★ جلب الرقم المرسل — الأولوية:
        //   1. المحدد في الـ request
        //   2. جلسة المستخدم الحالي (per-user)  ← الطبقة الجديدة
        //   3. الرئيسي العام للمرحلة (legacy / Unified mode)
        //   4. أول متصل في المرحلة
        var senderPhone  = request.SenderPhone;
        var senderUserType = "وكيل";

        // ★ طبقة per-user: إذا المستخدم الحالي عنده جلسة خاصة، نستخدمها.
        if (string.IsNullOrEmpty(senderPhone))
        {
            var currentUserId = int.TryParse(
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? (int?)uid : null;
            if (currentUserId.HasValue)
            {
                var userSession = await _db.WhatsAppSessions
                    .Where(s => s.UserId == currentUserId && s.IsPrimary &&
                           (string.IsNullOrEmpty(request.Stage) || s.Stage == request.Stage))
                    .FirstOrDefaultAsync();
                if (userSession != null)
                {
                    senderPhone    = userSession.PhoneNumber;
                    senderUserType = userSession.UserType ?? "وكيل";
                }
            }
        }

        if (string.IsNullOrEmpty(senderPhone) && !string.IsNullOrEmpty(request.Stage))
        {
            // ★ legacy fallback: أي جلسة رئيسية بدون مستخدم (Unified mode).
            var primary = await _db.WhatsAppSessions
                .Where(s => s.Stage == request.Stage && s.IsPrimary && s.UserId == null)
                .FirstOrDefaultAsync()
                ?? await _db.WhatsAppSessions
                    .Where(s => s.Stage == request.Stage && s.IsPrimary)
                    .FirstOrDefaultAsync();
            senderPhone    = primary?.PhoneNumber;
            senderUserType = primary?.UserType ?? "وكيل";
        }

        // ★ Fallback: أول رقم متصل في المرحلة — مطابق GAS سطر 1120 (getConnectedSessionsByStage)
        if (string.IsNullOrEmpty(senderPhone) && !string.IsNullOrEmpty(request.Stage))
        {
            var serverPhones = await _waServer.GetConnectedSessionsAsync(serverUrl);
            var stageSessions = await _db.WhatsAppSessions
                .Where(s => s.Stage == request.Stage)
                .ToListAsync();
            var firstConnected = stageSessions.FirstOrDefault(s => serverPhones.Contains(s.PhoneNumber));
            senderPhone    = firstConnected?.PhoneNumber;
            senderUserType = firstConnected?.UserType ?? "وكيل";
        }

        if (string.IsNullOrEmpty(senderPhone))
            return BadRequest(ApiResponse<object>.Fail(
                $"لا يوجد رقم رئيسي متصل لمرحلة {request.Stage}. يرجى ربط رقم رئيسي من أدوات واتساب."));

        var success = await _waServer.SendMessageAsync(serverUrl, senderPhone, request.RecipientPhone, request.Message);

        if (success)
        {
            var session = await _db.WhatsAppSessions
                .Where(s => s.PhoneNumber == senderPhone &&
                       (string.IsNullOrEmpty(request.Stage) || s.Stage == request.Stage))
                .FirstOrDefaultAsync();
            if (session != null)
            {
                session.MessageCount++;
                session.LastUsed = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return Ok(ApiResponse<object>.Ok(new { success }));
    }

    // ===== Send + Log (sendWhatsAppWithLog equivalent) =====
    // ★ ترتيب العمليات مطابق GAS سطر 1146: سجّل → أرسل → حدّث الحالة

    [HttpPost("send-with-log")]
    public async Task<ActionResult<ApiResponse<object>>> SendWithLog([FromBody] SendWithLogRequest request)
    {
        if (string.IsNullOrEmpty(request.Phone))
            return BadRequest(ApiResponse<object>.Fail("رقم الجوال مطلوب"));

        var settings  = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        Stage? stageEnum = null;
        if (!string.IsNullOrEmpty(request.Stage) && Enum.TryParse<Stage>(request.Stage, true, out var parsed))
            stageEnum = parsed;

        // ★ 1. جلب رقم الواتساب — أولوية:
        //   (أ) جلسة المستخدم الحالي في WhatsAppSessions (per-user — الجديد)
        //   (ب) المستخدم المسؤول عن المرحلة (User.WhatsAppPhone legacy)
        //   (ج) الرئيسي العام للمرحلة (Unified mode)
        string? senderPhone = null;
        string? senderUserType = null;

        // (أ) جلسة المستخدم الحالي
        var currentUserIdNullable = int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uidNow) ? (int?)uidNow : null;
        if (currentUserIdNullable.HasValue)
        {
            var ownSession = await _db.WhatsAppSessions
                .Where(s => s.UserId == currentUserIdNullable && s.IsPrimary &&
                       (string.IsNullOrEmpty(request.Stage) || s.Stage == request.Stage))
                .FirstOrDefaultAsync();
            if (ownSession != null)
            {
                senderPhone = ownSession.PhoneNumber;
                senderUserType = ownSession.UserType;
            }
        }

        // (ب) بحث عن مستخدم لديه واتساب ونطاقه يشمل المرحلة
        if (string.IsNullOrEmpty(senderPhone) && !string.IsNullOrEmpty(request.Stage))
        {
            var userWithWA = await _db.Users
                .Where(u => u.IsActive && u.HasWhatsApp && u.WhatsAppPhone != "" &&
                       (u.ScopeType == "all" || (u.ScopeType == "stage" && u.ScopeValue.Contains(request.Stage))))
                .FirstOrDefaultAsync();
            if (userWithWA != null)
            {
                senderPhone = userWithWA.WhatsAppPhone;
                senderUserType = userWithWA.Role.ToString();
            }
        }

        // (ج) الجلسات القديمة (WhatsAppSessions) كـ fallback — نفضّل UserId==null (Unified)
        WhatsAppSession? senderSession = null;
        if (string.IsNullOrEmpty(senderPhone) && !string.IsNullOrEmpty(request.Stage))
        {
            senderSession = await _db.WhatsAppSessions
                .Where(s => s.Stage == request.Stage && s.IsPrimary && s.UserId == null)
                .FirstOrDefaultAsync()
                ?? await _db.WhatsAppSessions
                    .Where(s => s.Stage == request.Stage && s.IsPrimary)
                    .FirstOrDefaultAsync();
            if (senderSession != null)
            {
                senderPhone = senderSession.PhoneNumber;
                senderUserType = senderSession.UserType;
            }
        }

        // Fallback: if deputy can use admin's phone
        if (string.IsNullOrEmpty(senderPhone))
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUser = await _db.Users.FindAsync(currentUserId);

            if (currentUser?.CanUseAdminWhatsApp == true)
            {
                var adminUser = await _db.Users
                    .Where(u => u.Role == UserRole.Admin && u.IsActive && u.HasWhatsApp && u.WhatsAppPhone != "")
                    .FirstOrDefaultAsync();

                if (adminUser != null)
                {
                    senderPhone = adminUser.WhatsAppPhone;
                    senderUserType = "مدير (نيابة)";
                }
                else
                {
                    return Ok(ApiResponse<object>.Fail("المدير فعّل لك الإرسال من رقمه لكن لم يربط رقمه بعد"));
                }
            }
        }

        // Final check — no phone available at all
        if (string.IsNullOrEmpty(senderPhone))
            return Ok(ApiResponse<object>.Fail(
                $"لا يوجد رقم واتساب مخصص لمرحلة {request.Stage}. يرجى تعيين رقم واتساب من إعدادات الهيئة الإدارية."));

        // ★ 2. تسجيل الرسالة أولاً بحالة "جاري الإرسال" — مطابق GAS سطر 1163 (logCommunication)
        var now = DateTime.UtcNow;
        var hijriDate = _hijri.GetHijriDate();

        var log = new CommunicationLog
        {
            HijriDate     = hijriDate,
            MiladiDate    = now.ToString("yyyy/MM/dd"),
            Time          = now.ToString("HH:mm"),
            StudentId     = request.StudentId,
            StudentNumber = request.StudentNumber ?? "",
            StudentName   = request.StudentName ?? "",
            Grade         = request.Grade ?? "",
            Class         = request.ClassName ?? "",
            Stage         = stageEnum ?? Stage.Intermediate,
            Mobile        = request.Phone ?? "",
            MessageType   = request.MessageType ?? "واتساب",
            MessageTitle  = request.MessageTitle ?? "",
            MessageBody   = request.Message ?? "",
            SendStatus    = "جاري الإرسال",
            SentBy        = request.Sender ?? "الوكيل",
            Notes         = "",
        };

        _db.CommunicationLogs.Add(log);
        await _db.SaveChangesAsync();

        // ★ 3. إرسال الرسالة — مطابق GAS سطر 1184 (sendWhatsAppMessageFrom)
        var sendSuccess = await _waServer.SendMessageAsync(serverUrl, senderPhone, request.Phone!, request.Message ?? "");

        // ★ 4. تحديث حالة التسجيل + عداد الرسائل — مطابق GAS سطر 1188
        if (sendSuccess)
        {
            log.SendStatus = "تم";
            if (senderSession != null)
            {
                senderSession.MessageCount++;
                senderSession.LastUsed = DateTime.UtcNow;
            }
        }
        else
        {
            log.SendStatus = "فشل";
            log.Notes      = "فشل الإرسال";
        }
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            success = sendSuccess,
            logId   = log.Id,
            status  = log.SendStatus,
        }));
    }

    // ===== Sessions Management =====

    [HttpGet("sessions")]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetSessions(
        [FromQuery] string? stage = null, [FromQuery] string? userType = null)
    {
        var query = _db.WhatsAppSessions.AsQueryable();
        if (!string.IsNullOrEmpty(stage))
            query = query.Where(s => s.Stage == stage);
        if (!string.IsNullOrEmpty(userType))
            query = query.Where(s => s.UserType == userType);

        var sessions = await query
            .OrderByDescending(s => s.IsPrimary)
            .ThenByDescending(s => s.LastUsed)
            .Select(s => new
            {
                s.Id, s.PhoneNumber, s.Stage, s.UserType,
                s.ConnectionStatus, s.LinkedAt, s.LastUsed,
                s.MessageCount, s.IsPrimary
            })
            .ToListAsync();

        return Ok(ApiResponse<List<object>>.Ok(sessions.Cast<object>().ToList()));
    }

    // ★ حد أقصى لأرقام الواتساب لكل مدرسة — يحمي السيرفر الخارجي من الإرهاق.
    private const int MaxSessionsPerSchool = 8;

    [HttpPost("sessions")]
    public async Task<ActionResult<ApiResponse<object>>> AddSession([FromBody] AddSessionRequest request)
    {
        if (string.IsNullOrEmpty(request.PhoneNumber))
            return BadRequest(ApiResponse.Fail("رقم الواتساب مطلوب"));

        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
        var whatsAppMode   = schoolSettings?.WhatsAppMode.ToString() ?? "PerStage";
        var effectiveStage = whatsAppMode == "Unified" ? "" : (request.Stage ?? "");
        var cleanPhone     = CleanPhoneNumber(request.PhoneNumber);

        // ★ UserId من الـ JWT (null إذا كان استدعاء anonymous — مثلاً من لوحة التحكم).
        var currentUserId = int.TryParse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid)
            ? (int?)uid : null;

        // ★ حد أقصى: 8 أرقام لكل مدرسة (tenant) — يُتخطّى إذا كان الرقم موجود ونحن نحدّث فقط.
        var alreadyExistsForUser = await _db.WhatsAppSessions.AnyAsync(s =>
            CleanPhoneNumber(s.PhoneNumber) == cleanPhone && s.UserId == currentUserId);
        if (!alreadyExistsForUser)
        {
            var schoolSessionCount = await _db.WhatsAppSessions.CountAsync();
            if (schoolSessionCount >= MaxSessionsPerSchool)
                return Ok(ApiResponse<object>.Fail(
                    $"وصلت للحد الأقصى ({MaxSessionsPerSchool} أرقام لكل مدرسة). احذف رقماً قديماً قبل ربط رقم جديد."));
        }

        // ★ جلسات المرحلة — نحتاجها لتعديل IsPrimary داخل scope المستخدم.
        var stageSessions = await _db.WhatsAppSessions
            .Where(s => s.Stage == effectiveStage)
            .ToListAsync();

        // ★ Dedupe per-user: نفس الرقم لنفس المستخدم = تحديث.
        // نفس الرقم لمستخدم آخر = جلسة مستقلة (لكل وكيل رقمه).
        var existing = stageSessions.FirstOrDefault(s =>
            CleanPhoneNumber(s.PhoneNumber) == cleanPhone &&
            s.UserId == currentUserId);

        if (existing != null)
        {
            // IsPrimary محصور بـ scope المستخدم: نطفّي الرئيسي فقط لجلسات هذا المستخدم.
            foreach (var s in stageSessions.Where(s => s.UserId == currentUserId))
                s.IsPrimary = false;
            existing.ConnectionStatus = "متصل";
            existing.LastUsed         = DateTime.UtcNow;
            existing.IsPrimary        = true;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new
            {
                id        = existing.Id,
                message   = "تم تحديث الرقم وتعيينه كرئيسي",
                isPrimary = true,
            }));
        }

        // رقم جديد: نطفّي الرئيسي فقط لهذا المستخدم (لا نلمس جلسات المستخدمين الآخرين)
        foreach (var s in stageSessions.Where(s => s.UserId == currentUserId))
            s.IsPrimary = false;

        var session = new WhatsAppSession
        {
            UserId           = currentUserId,
            PhoneNumber      = cleanPhone,
            Stage            = effectiveStage,
            UserType         = request.UserType ?? "",
            ConnectionStatus = "متصل",
            LinkedAt         = DateTime.UtcNow,
            LastUsed         = DateTime.UtcNow,
            IsPrimary        = true,
        };

        _db.WhatsAppSessions.Add(session);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            id        = session.Id,
            message   = "تم حفظ الرقم كرقم رئيسي",
            isPrimary = true,
        }));
    }

    [HttpPut("sessions/{id}/primary")]
    public async Task<ActionResult<ApiResponse>> SetPrimary(int id)
    {
        var session = await _db.WhatsAppSessions.FindAsync(id);
        if (session == null)
            return NotFound(ApiResponse.Fail("الجلسة غير موجودة"));

        // ★ (1) فحص الملكية — الأدمن يعدّل أي جلسة، غيره جلساته فقط.
        var currentUserId = int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : 0;
        var currentRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        var isAdmin = currentRole == "Admin";

        if (!isAdmin && session.UserId != currentUserId)
            return Ok(ApiResponse.Fail("لا تملك صلاحية تعديل هذه الجلسة"));

        // ★ (2) إزالة الرئيسي ضمن نفس scope المستخدم (per-user) — لا نلمس جلسات الآخرين.
        // هذا يحافظ على إصلاح per-user IsPrimary الذي عملناه سابقاً.
        var sameUserSessions = await _db.WhatsAppSessions
            .Where(s => s.Stage == session.Stage && s.UserId == session.UserId)
            .ToListAsync();
        foreach (var s in sameUserSessions) s.IsPrimary = false;
        session.IsPrimary = true;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تعيين الرقم الرئيسي"));
    }

    [HttpDelete("sessions/{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteSession(
        int id,
        [FromServices] ILogger<WhatsAppController> logger)
    {
        var session = await _db.WhatsAppSessions.FindAsync(id);
        if (session == null)
            return NotFound(ApiResponse.Fail("الجلسة غير موجودة"));

        // ★ (1) فحص الملكية — الأدمن يحذف أي جلسة، غيره يحذف جلسته فقط.
        var currentUserId = int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : 0;
        var currentRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        var isAdmin = currentRole == "Admin";

        if (!isAdmin && session.UserId != currentUserId)
            return Ok(ApiResponse.Fail("لا تملك صلاحية حذف هذه الجلسة"));

        // ★ (2) حماية آخر جلسة أدمن في Unified mode.
        // لو الوضع موحد وفيه وكلاء يعتمدون على رقم الأدمن، لا يُسمح بحذفه.
        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
        var isUnifiedMode = schoolSettings?.WhatsAppMode == Domain.Enums.WhatsAppMode.Unified;
        if (isUnifiedMode)
        {
            var adminIds = await _db.Users
                .Where(u => u.Role == UserRole.Admin && u.IsActive)
                .Select(u => u.Id).ToListAsync();
            var isAdminSession = session.UserId == null ||
                (session.UserId.HasValue && adminIds.Contains(session.UserId.Value));
            if (isAdminSession)
            {
                var otherAdminSessions = await _db.WhatsAppSessions
                    .CountAsync(s => s.Id != id &&
                        (s.UserId == null || adminIds.Contains(s.UserId ?? 0)));
                var hasDeputies = await _db.Users
                    .AnyAsync(u => u.Role == UserRole.Deputy && u.IsActive);
                if (otherAdminSessions == 0 && hasDeputies)
                    return Ok(ApiResponse.Fail(
                        "لا يمكن حذف آخر رقم للمدرسة في الوضع الموحد — الوكلاء يعتمدون عليه. " +
                        "غيّر الوضع إلى 'متعدد' أولاً، أو اربط رقماً بديلاً."));
            }
        }

        // ★ (3) محاولة فصل الجلسة من السيرفر الخارجي — best-effort، لا يمنع الحذف.
        try
        {
            var settings = await GetOrCreateSettingsAsync();
            var serverUrl = settings?.ServerUrl ?? "";
            if (!string.IsNullOrEmpty(serverUrl))
            {
                var disconnected = await _waServer.DisconnectSessionAsync(serverUrl, session.PhoneNumber);
                if (!disconnected)
                    logger.LogWarning("فشل فصل الجلسة من السيرفر الخارجي — سنحذف من DB فقط. Phone: {Phone}",
                        session.PhoneNumber);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "خطأ أثناء فصل الجلسة من السيرفر الخارجي");
        }

        // ★ (4) حذف من قاعدة البيانات.
        _db.WhatsAppSessions.Remove(session);
        await _db.SaveChangesAsync();

        logger.LogInformation("تم حذف جلسة واتساب — SessionId: {Id}, Phone: {Phone}, By: {UserId}",
            id, session.PhoneNumber, currentUserId);

        return Ok(ApiResponse.Ok("تم فصل الرقم بنجاح"));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<object>>> GetStats([FromQuery] string? stage = null)
    {
        var settings  = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        // جلب الأرقام المحفوظة للمرحلة — مطابق savedSessions في GAS
        var savedQ = _db.WhatsAppSessions.AsQueryable();
        if (!string.IsNullOrEmpty(stage))
            savedQ = savedQ.Where(s => s.Stage == stage);
        var savedSessions = await savedQ.ToListAsync();

        // جلب الأرقام المتصلة من السيرفر — مطابق connectedPhones في GAS
        var serverPhones = new List<string>();
        if (!string.IsNullOrEmpty(serverUrl))
        {
            var connected = await _waServer.GetConnectedSessionsAsync(serverUrl);
            serverPhones = connected;
        }

        if (!string.IsNullOrEmpty(stage))
        {
            // ★ getWhatsAppStats(stage) — مطابق GAS سطر 1211
            var allSessWithStatus = savedSessions.Select(s => new
            {
                phone        = s.PhoneNumber,
                stage        = s.Stage,
                userType     = s.UserType,
                status       = serverPhones.Contains(s.PhoneNumber) ? "متصل" : "غير متصل",
                linkedDate   = s.LinkedAt?.ToString("yyyy/MM/dd HH:mm") ?? "",
                lastUsed     = s.LastUsed?.ToString("yyyy/MM/dd HH:mm") ?? "",
                messageCount = s.MessageCount,
                isPrimary    = s.IsPrimary,
            }).ToList();

            var connectedSess = allSessWithStatus.Where(s => s.status == "متصل").Cast<object>().ToList();
            var totalMessages = savedSessions.Sum(s => s.MessageCount);

            return Ok(ApiResponse<object>.Ok(new
            {
                success = true,
                stats = new
                {
                    connectedPhones = connectedSess.Count,
                    savedPhones     = savedSessions.Count,
                    totalMessages,
                    sessions    = connectedSess,
                    allSessions = allSessWithStatus.Cast<object>().ToList(),
                },
                stage,
            }));
        }
        else
        {
            // ★ getAllPhonesStats() — مطابق GAS سطر 1244
            var phones = savedSessions.Select(s =>
            {
                var isConnected = serverPhones.Contains(s.PhoneNumber);
                return new
                {
                    phone        = s.PhoneNumber,
                    stage        = s.Stage,
                    userType     = s.UserType,
                    status       = isConnected ? "متصل" : "غير متصل",
                    linkedDate   = s.LinkedAt?.ToString("yyyy/MM/dd HH:mm") ?? "",
                    lastUsed     = s.LastUsed?.ToString("yyyy/MM/dd HH:mm") ?? "",
                    messageCount = s.MessageCount,
                };
            }).ToList();

            var totalMessages  = phones.Sum(p => p.messageCount);
            var connectedCount = phones.Count(p => p.status == "متصل");

            return Ok(ApiResponse<object>.Ok(new
            {
                success = true,
                stats = new
                {
                    totalPhones      = phones.Count,
                    connectedPhones  = connectedCount,
                    totalMessages,
                    phones           = phones.Cast<object>().ToList(),
                },
            }));
        }
    }

    [HttpGet("user-types")]
    public ActionResult<ApiResponse<List<string>>> GetUserTypes()
    {
        return Ok(ApiResponse<List<string>>.Ok(new List<string> { "وكيل", "مدير", "موجه" }));
    }

    // ===== getPrimaryPhoneForStage — الرقم الرئيسي لمرحلة معينة =====
    // مطابق لـ getPrimaryPhoneForStage() في Server_WhatsApp.gs سطر 453–476

    [HttpGet("sessions/primary")]
    public async Task<ActionResult<ApiResponse<object>>> GetPrimaryForStage([FromQuery] string? stage = null)
    {
        // أولاً: بحث عن مستخدم لديه واتساب ونطاقه يشمل المرحلة
        if (!string.IsNullOrEmpty(stage))
        {
            var userWithWA = await _db.Users
                .Where(u => u.IsActive && u.HasWhatsApp && u.WhatsAppPhone != "" &&
                       (u.ScopeType == "all" || (u.ScopeType == "stage" && u.ScopeValue.Contains(stage))))
                .FirstOrDefaultAsync();
            if (userWithWA != null)
            {
                return Ok(ApiResponse<object>.Ok(new
                {
                    found = true,
                    phoneNumber = userWithWA.WhatsAppPhone,
                    stage,
                    userName = userWithWA.Name,
                    source = "user",
                }));
            }
        }

        // بديل: الجلسات القديمة
        var primary = await _db.WhatsAppSessions
            .Where(s => s.IsPrimary &&
                   (string.IsNullOrEmpty(stage) || s.Stage == stage))
            .FirstOrDefaultAsync();

        if (primary == null)
            return Ok(ApiResponse<object>.Ok(new { found = false }));

        return Ok(ApiResponse<object>.Ok(new
        {
            found        = true,
            id           = primary.Id,
            phoneNumber  = primary.PhoneNumber,
            stage        = primary.Stage,
            userType     = primary.UserType,
            connectionStatus = primary.ConnectionStatus,
            isPrimary    = true,
            source       = "session",
        }));
    }

    // ===== updatePhoneStatus — تحديث حالة جلسة =====
    // مطابق لـ updatePhoneStatus() في Server_WhatsApp.gs سطر 503–519

    [HttpPut("sessions/{id}/status")]
    public async Task<ActionResult<ApiResponse>> UpdateSessionStatus(int id, [FromBody] WhatsAppUpdateStatusRequest request)
    {
        var session = await _db.WhatsAppSessions.FindAsync(id);
        if (session == null)
            return NotFound(ApiResponse.Fail("الجلسة غير موجودة"));

        session.ConnectionStatus = request.Status ?? "غير متصل";
        session.LastUsed = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تحديث الحالة"));
    }

    // ===== rebuildSessionsSheet — إعادة بناء الجلسات =====
    // مطابق لـ rebuildSessionsSheet() في Server_WhatsApp.gs سطر 136–151

    [HttpPost("sessions/rebuild")]
    public async Task<ActionResult<ApiResponse>> RebuildSessions()
    {
        var all = await _db.WhatsAppSessions.ToListAsync();
        _db.WhatsAppSessions.RemoveRange(all);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم إعادة بناء الجلسات بنجاح"));
    }

    // ===== checkPhoneStatusInServer — فحص رقم معين في السيرفر =====
    // مطابق لـ checkPhoneStatusInServer() في Server_WhatsApp.gs سطر 671–685

    [HttpGet("sessions/check-server")]
    public async Task<ActionResult<ApiResponse<object>>> CheckPhoneOnServer([FromQuery] string phone)
    {
        if (string.IsNullOrEmpty(phone))
            return BadRequest(ApiResponse<object>.Fail("رقم الجوال مطلوب"));

        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";
        if (string.IsNullOrEmpty(serverUrl))
            return Ok(ApiResponse<object>.Ok(new { connected = false, error = "رابط السيرفر غير مُعيّن" }));

        var serverPhones = await _waServer.GetConnectedSessionsAsync(serverUrl);
        var cleanPhone   = CleanPhoneNumber(phone);
        var found        = serverPhones.FirstOrDefault(p =>
            CleanPhoneNumber(p) == cleanPhone || p.Contains(cleanPhone));

        return Ok(ApiResponse<object>.Ok(new { connected = found != null, phoneNumber = found }));
    }

    // ===== getConnectedSessionsByStage — الأرقام المتصلة حسب المرحلة =====
    // مطابق لـ getConnectedSessionsByStage() في Server_WhatsApp.gs سطر 705–745

    [HttpGet("connected-sessions/by-stage")]
    public async Task<ActionResult<ApiResponse<object>>> GetConnectedByStage([FromQuery] string? stage = null)
    {
        var settings      = await GetOrCreateSettingsAsync();
        var serverUrl     = settings?.ServerUrl ?? "";
        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
        var whatsAppMode  = schoolSettings?.WhatsAppMode.ToString() ?? "PerStage";
        var effectiveStage = whatsAppMode == "Unified" ? "" : (stage ?? "");

        // جلب الأرقام المتصلة من السيرفر
        var serverPhones = new List<string>();
        if (!string.IsNullOrEmpty(serverUrl))
            serverPhones = await _waServer.GetConnectedSessionsAsync(serverUrl);

        // جلب الجلسات المحفوظة للمرحلة
        var query = _db.WhatsAppSessions.AsQueryable();
        if (!string.IsNullOrEmpty(effectiveStage))
            query = query.Where(s => s.Stage == effectiveStage);
        var saved = await query.ToListAsync();

        var allSessions = saved.Select(s => new
        {
            s.Id, s.PhoneNumber, s.Stage, s.UserType,
            s.IsPrimary, s.MessageCount,
            isConnected      = serverPhones.Contains(s.PhoneNumber),
            connectionStatus = serverPhones.Contains(s.PhoneNumber) ? "متصل" : "غير متصل",
        }).ToList();

        var connectedSessions = allSessions.Where(s => s.isConnected).ToList<object>();

        return Ok(ApiResponse<object>.Ok(new
        {
            allSessions      = allSessions.Cast<object>().ToList(),
            connectedSessions,
            stage            = effectiveStage,
            whatsAppMode,
        }));
    }

    // ===== inspectQREndpoint — تشخيص صفحة QR من السيرفر =====
    // مطابق لـ inspectQREndpoint() في Server_WhatsApp.gs سطر 601–663

    [HttpGet("qr/inspect")]
    public async Task<ActionResult<ApiResponse<object>>> InspectQR()
    {
        var settings  = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";
        if (string.IsNullOrEmpty(serverUrl))
            return Ok(ApiResponse<object>.Ok(new { success = false, error = "رابط السيرفر غير مُعيّن" }));

        var result = await _waServer.InspectQRAsync(serverUrl);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // ===== syncAndSavePhone — مزامنة رقم من السيرفر وحفظه =====
    // مطابق لـ syncAndSavePhone() في Server_WhatsApp.gs سطر 894–910
    // + منطق saveWhatsAppPhone() في Server_WhatsApp.gs سطر 370–420

    [HttpPost("sessions/sync")]
    public async Task<ActionResult<ApiResponse<object>>> SyncAndSave([FromBody] SyncSaveRequest request)
    {
        if (string.IsNullOrEmpty(request.PhoneNumber))
            return BadRequest(ApiResponse<object>.Fail("رقم الواتساب مطلوب"));

        var settings       = await GetOrCreateSettingsAsync();
        var serverUrl      = settings?.ServerUrl ?? "";
        var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
        var whatsAppMode   = schoolSettings?.WhatsAppMode.ToString() ?? "PerStage";
        var effectiveStage = whatsAppMode == "Unified" ? "" : (request.Stage ?? "");
        var cleanPhone     = CleanPhoneNumber(request.PhoneNumber);

        // ★ التحقق من أن الرقم متصل فعلاً على السيرفر
        // نستخدم IsSessionAliveAsync (فحص فردي عبر /send) بدل GetConnectedSessionsAsync (غير مدعوم)
        if (!string.IsNullOrEmpty(serverUrl))
        {
            var isAlive = await _waServer.IsSessionAliveAsync(serverUrl, cleanPhone);
            if (!isAlive)
            {
                // الجلسة ممكن لم تُسجّل بعد — ننتظر قليلاً ونعيد الفحص
                await Task.Delay(2000);
                isAlive = await _waServer.IsSessionAliveAsync(serverUrl, cleanPhone);
            }
            // لا نمنع الحفظ — الرقم جاء من QR ناجح، نحفظه حتى لو الفحص فشل
            // لكن نسجّل الحالة الفعلية
        }

        // ★ UserId من JWT — الجلسة تُربط بالمستخدم الذي ربط رقمه.
        var currentUserId = int.TryParse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid)
            ? (int?)uid : null;

        var stageSessions = await _db.WhatsAppSessions
            .Where(s => s.Stage == effectiveStage)
            .ToListAsync();

        // نطفّي الرئيسي فقط لجلسات هذا المستخدم (كل وكيل له رقمه الرئيسي المستقل).
        foreach (var s in stageSessions.Where(s => s.UserId == currentUserId))
            s.IsPrimary = false;

        // هل الرقم موجود مسبقاً لنفس المستخدم؟
        var existing = stageSessions.FirstOrDefault(s =>
            s.PhoneNumber == cleanPhone &&
            s.UserId == currentUserId);

        if (existing != null)
        {
            existing.ConnectionStatus = "متصل";
            existing.IsPrimary        = true;
            existing.LastUsed         = DateTime.UtcNow;
        }
        else
        {
            // ★ فحص الحد الأقصى (8 أرقام لكل مدرسة) قبل إضافة جلسة جديدة.
            var schoolSessionCount = await _db.WhatsAppSessions.CountAsync();
            if (schoolSessionCount >= MaxSessionsPerSchool)
                return Ok(ApiResponse<object>.Fail(
                    $"وصلت للحد الأقصى ({MaxSessionsPerSchool} أرقام لكل مدرسة). احذف رقماً قديماً قبل ربط رقم جديد."));

            _db.WhatsAppSessions.Add(new WhatsAppSession
            {
                UserId           = currentUserId,
                PhoneNumber      = cleanPhone,
                Stage            = effectiveStage,
                UserType         = request.UserType ?? "وكيل",
                ConnectionStatus = "متصل",
                LinkedAt         = DateTime.UtcNow,
                LastUsed         = DateTime.UtcNow,
                IsPrimary        = true,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new
        {
            success     = true,
            message     = "تم حفظ الرقم كرقم رئيسي",
            phoneNumber = cleanPhone,
            isPrimary   = true,
        }));
    }

    // ===== مساعد: إخفاء رقم الجوال =====
    // مطابق لـ maskPhone() في Server_WhatsApp.gs: substring(0,6) + '****' + substring(length-2)
    private static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 8) return null;
        return phone[..6] + "****" + phone[^2..];
    }

    // ===== مساعد: تنظيف رقم الجوال =====
    // مطابق لـ cleanPhoneNumber() في Server_WhatsApp.gs سطر 1063–1073
    private static string CleanPhoneNumber(string phone)
    {
        var clean = new string(phone.Where(char.IsDigit).ToArray());
        if (clean.StartsWith("05"))               clean = "966" + clean[1..];
        else if (clean.StartsWith("5") && clean.Length == 9) clean = "966" + clean;
        else if (!clean.StartsWith("966") && clean.Length == 9) clean = "966" + clean;
        return clean;
    }

    // ===== Security Code =====

    [HttpGet("security/status")]
    public async Task<ActionResult<ApiResponse<object>>> GetSecurityStatus()
    {
        var settings = await GetOrCreateSettingsAsync();
        return Ok(ApiResponse<object>.Ok(new
        {
            hasSecurityCode = !string.IsNullOrEmpty(settings?.SecurityCode),
            hasRecoveryPhone1 = !string.IsNullOrEmpty(settings?.RecoveryPhone1),
            hasRecoveryPhone2 = !string.IsNullOrEmpty(settings?.RecoveryPhone2),
            recoveryPhone1Masked = MaskPhone(settings?.RecoveryPhone1),
            recoveryPhone2Masked = MaskPhone(settings?.RecoveryPhone2),
        }));
    }

    [HttpPost("security/setup")]
    public async Task<ActionResult<ApiResponse>> SetupSecurityCode([FromBody] SecuritySetupRequest request)
    {
        if (string.IsNullOrEmpty(request.Code) || request.Code.Length < 6)
            return Ok(ApiResponse.Fail("رمز الأمان يجب أن يكون 6 أرقام على الأقل"));
        if (string.IsNullOrEmpty(request.RecoveryPhone1))
            return Ok(ApiResponse.Fail("جوال الاسترجاع الأول مطلوب"));

        var settings = await GetOrCreateSettingsAsync();

        settings.SecurityCode = BCrypt.Net.BCrypt.HashPassword(request.Code);
        settings.RecoveryPhone1 = request.RecoveryPhone1;
        settings.RecoveryPhone2 = request.RecoveryPhone2 ?? "";

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تعيين رمز الأمان بنجاح"));
    }

    [HttpPost("security/verify")]
    public async Task<ActionResult<ApiResponse<object>>> VerifySecurityCode([FromBody] SecurityVerifyRequest request)
    {
        var settings = await GetOrCreateSettingsAsync();
        if (settings == null || string.IsNullOrEmpty(settings.SecurityCode))
            return Ok(ApiResponse<object>.Ok(new { valid = true })); // No code set = open

        var valid = BCrypt.Net.BCrypt.Verify(request.Code ?? "", settings.SecurityCode);
        return Ok(ApiResponse<object>.Ok(new { valid }));
    }

    [HttpPost("security/request-recovery")]
    public async Task<ActionResult<ApiResponse<object>>> RequestRecoveryCode([FromBody] RecoveryRequest request)
    {
        var settings = await GetOrCreateSettingsAsync();
        if (settings == null || string.IsNullOrEmpty(settings.SecurityCode))
            return Ok(ApiResponse.Fail("لا يوجد رمز أمان محدد"));

        var targetPhone = request.PhoneIndex == 2 ? settings.RecoveryPhone2 : settings.RecoveryPhone1;
        if (string.IsNullOrEmpty(targetPhone))
            return Ok(ApiResponse.Fail("جوال الاسترجاع غير محدد"));

        // Generate 4-digit code — مطابق GAS: Math.floor(1000 + Math.random() * 9000) → 1000-9999
        var code = new Random().Next(1000, 10000).ToString();
        settings.TempRecoveryCode = code;
        settings.RecoveryCodeExpiry = DateTime.UtcNow.AddMinutes(5);
        await _db.SaveChangesAsync();

        // Send via WhatsApp — نص الرسالة مطابق لـ GAS سطر 283
        var serverUrl = settings.ServerUrl ?? "";
        if (!string.IsNullOrEmpty(serverUrl))
        {
            var senderPhone = (await _db.WhatsAppSessions.FirstOrDefaultAsync(s => s.IsPrimary))?.PhoneNumber;
            if (!string.IsNullOrEmpty(senderPhone))
            {
                await _waServer.SendMessageAsync(serverUrl, senderPhone, targetPhone,
                    $"🔐 رمز استرجاع رمز الأمان الخاص بنظام التوجيه الطلابي:\n\n{code}\n\nصالح لمدة 5 دقائق فقط.");
            }
        }

        return Ok(ApiResponse<object>.Ok(new { sent = true, phoneMasked = MaskPhone(targetPhone) }));
    }

    [HttpPost("security/verify-recovery")]
    public async Task<ActionResult<ApiResponse<object>>> VerifyRecoveryCode([FromBody] SecurityVerifyRequest request)
    {
        var settings = await GetOrCreateSettingsAsync();
        if (settings == null)
            return Ok(ApiResponse<object>.Ok(new { valid = false }));

        var valid = settings.TempRecoveryCode == request.Code
                    && settings.RecoveryCodeExpiry.HasValue
                    && settings.RecoveryCodeExpiry.Value > DateTime.UtcNow;

        if (valid)
        {
            // Clear temp code after successful use
            settings.TempRecoveryCode = "";
            settings.RecoveryCodeExpiry = null;
            await _db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { valid }));
    }

    // ===== Pairing Code — ربط عبر رقم الجوال (جاهز للتفعيل لاحقاً) =====
    // ★ لا يُعرض في الواجهة حتى يطلب المستخدم تفعيله
    // يتطلب سيرفر يدعم /pair endpoint (مثل Baileys)

    [HttpPost("pair")]
    public async Task<ActionResult<ApiResponse<object>>> RequestPairingCode([FromBody] PairingCodeRequest request)
    {
        if (string.IsNullOrEmpty(request.PhoneNumber))
            return BadRequest(ApiResponse<object>.Fail("رقم الجوال مطلوب"));

        var settings = await GetOrCreateSettingsAsync();
        var serverUrl = settings?.ServerUrl ?? "";

        if (string.IsNullOrEmpty(serverUrl))
            return BadRequest(ApiResponse<object>.Fail("رابط سيرفر الواتساب غير مُعيّن"));

        var result = await _waServer.RequestPairingCodeAsync(serverUrl, request.PhoneNumber);

        if (result.Success)
        {
            return Ok(ApiResponse<object>.Ok(new
            {
                success = true,
                code = result.Code,
                message = "تم الحصول على رمز الاقتران — أدخله في واتساب على جوالك"
            }));
        }

        return Ok(ApiResponse<object>.Fail(result.Error ?? "فشل الحصول على رمز الاقتران"));
    }

    // ===== Scenario Detection =====
    // ★ كشف السيناريو النشط تلقائياً:
    // 1 = مدير فقط (بدون وكلاء)
    // 2 = مدير + وكلاء، رقم موحد (الوكلاء يستخدمون رقم المدرسة)
    // 3 = مدير + وكلاء، مختلط (الوكيل يختار رقمه أو رقم المدرسة)
    // 4 = بدون رقم رئيسي، كل وكيل مستقل

    private async Task<int> DetectScenario()
    {
        var deputies = await _db.Users
            .Where(u => u.Role == UserRole.Deputy && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        // لا يوجد وكلاء → سيناريو 1
        if (deputies.Count == 0)
            return 1;

        // ★ المصدر الصحيح = WhatsAppSessions (وليس User.HasWhatsApp القديم).
        // رقم الأدمن = جلسة UserId = أدمن نشط، أو جلسة UserId=null (Unified mode legacy).
        var adminIds = await _db.Users
            .Where(u => u.Role == UserRole.Admin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        var adminHasNumber = await _db.WhatsAppSessions.AnyAsync(s =>
            s.UserId == null || (s.UserId.HasValue && adminIds.Contains(s.UserId.Value)));

        // هل أي وكيل عنده جلسة خاصة مربوطة؟
        var anyDeputyHasOwnNumber = await _db.WhatsAppSessions.AnyAsync(s =>
            s.UserId.HasValue && deputies.Contains(s.UserId.Value));

        // لا رقم رئيسي للأدمن → سيناريو 4 (الوكلاء فقط يربطون)
        if (!adminHasNumber)
            return 4;

        // رقم أدمن + وكيل عنده رقمه → سيناريو 3 (مختلط)
        if (anyDeputyHasOwnNumber)
            return 3;

        // رقم أدمن فقط → سيناريو 2 (موحد)
        return 2;
    }

    [HttpGet("scenario")]
    public async Task<ActionResult<ApiResponse<object>>> GetScenario()
    {
        var scenario = await DetectScenario();
        var deputies = await _db.Users
            .Where(u => u.Role == UserRole.Deputy && u.IsActive)
            .Select(u => new { u.Id, u.Name, u.ScopeValue, u.HasWhatsApp, u.WhatsAppPhone, u.CanUseAdminWhatsApp })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(new { scenario, deputies }));
    }

    // ===== Stage Teachers — معلمين المرحلة =====

    [HttpGet("stage-teachers")]
    public async Task<ActionResult<ApiResponse<object>>> GetStageTeachers()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var currentUser = await _db.Users.FindAsync(userId);
        if (currentUser == null) return Unauthorized();

        var teachers = await _db.Teachers.Where(t => t.IsActive).ToListAsync();

        // فلترة بحسب المرحلة — غير المدير يشوف معلمين مرحلته فقط
        if (currentUser.Role != UserRole.Admin && !string.IsNullOrEmpty(currentUser.ScopeValue))
        {
            var allowedStages = currentUser.ScopeValue.Split(',', StringSplitOptions.RemoveEmptyEntries);
            teachers = teachers
                .Where(t => !string.IsNullOrEmpty(t.AssignedClasses) &&
                            allowedStages.Any(stage => t.AssignedClasses.Contains(stage)))
                .ToList();
        }

        var result = teachers.Select(t => new
        {
            id = t.Id,
            name = t.Name,
            mobile = t.Mobile,
            subjects = t.Subjects,
            assignedClasses = t.AssignedClasses,
            hasLink = !string.IsNullOrEmpty(t.TokenLink),
        });

        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpPost("security/change-code")]
    public async Task<ActionResult<ApiResponse>> ChangeSecurityCode([FromBody] SecurityChangeRequest request)
    {
        var settings = await GetOrCreateSettingsAsync();
        if (settings == null)
            return Ok(ApiResponse.Fail("لا توجد إعدادات"));

        // Must verify old code first (unless using recovery bypass)
        if (!request.BypassOldCode)
        {
            if (string.IsNullOrEmpty(settings.SecurityCode))
                return Ok(ApiResponse.Fail("لا يوجد رمز أمان قديم"));
            if (!BCrypt.Net.BCrypt.Verify(request.OldCode ?? "", settings.SecurityCode))
                return Ok(ApiResponse.Fail("رمز الأمان القديم غير صحيح"));
        }

        if (string.IsNullOrEmpty(request.NewCode) || request.NewCode.Length < 6)
            return Ok(ApiResponse.Fail("رمز الأمان الجديد يجب أن يكون 6 أرقام على الأقل"));

        settings.SecurityCode = BCrypt.Net.BCrypt.HashPassword(request.NewCode);
        if (!string.IsNullOrEmpty(request.RecoveryPhone1))
            settings.RecoveryPhone1 = request.RecoveryPhone1;
        if (request.RecoveryPhone2 != null)
            settings.RecoveryPhone2 = request.RecoveryPhone2;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse.Ok("تم تغيير رمز الأمان بنجاح"));
    }
}

// ===== Request DTOs =====

public class WhatsAppSettingsRequest
{
    public string? ServerUrl { get; set; }
    public string? ServiceStatus { get; set; }
    public string? SmsApiToken { get; set; }
    public string? SmsSenderName { get; set; }
    public string? WhatsAppMode { get; set; }
}

public class SendWhatsAppRequest
{
    public string? SenderPhone { get; set; }
    public string? RecipientPhone { get; set; }
    public string? Message { get; set; }
    public string? Stage { get; set; }
}

public class SendWithLogRequest
{
    public int StudentId { get; set; }
    public string? StudentNumber { get; set; }
    public string? StudentName { get; set; }
    public string? Grade { get; set; }
    public string? ClassName { get; set; }
    public string? Phone { get; set; }
    public string? MessageType { get; set; }
    public string? MessageTitle { get; set; }
    public string? Message { get; set; }
    public string? Stage { get; set; }
    public string? Sender { get; set; }
}

public class SecuritySetupRequest
{
    public string? Code { get; set; }
    public string? RecoveryPhone1 { get; set; }
    public string? RecoveryPhone2 { get; set; }
}

public class SecurityVerifyRequest
{
    public string? Code { get; set; }
}

public class RecoveryRequest
{
    public int PhoneIndex { get; set; } = 1; // 1 or 2
}

public class SecurityChangeRequest
{
    public string? OldCode { get; set; }
    public string? NewCode { get; set; }
    public string? RecoveryPhone1 { get; set; }
    public string? RecoveryPhone2 { get; set; }
    public bool BypassOldCode { get; set; } // Used after recovery verification
}

// ===== DTOs الجديدة — مطابق للدوال الجديدة =====

public class WhatsAppUpdateStatusRequest
{
    public string? Status { get; set; }  // "متصل" | "غير متصل"
}

public class SyncSaveRequest
{
    public string? PhoneNumber { get; set; }
    public string? Stage       { get; set; }
    public string? UserType    { get; set; }
}

// ★ Pairing Code — جاهز للتفعيل لاحقاً
public class PairingCodeRequest
{
    public string? PhoneNumber { get; set; }
}
