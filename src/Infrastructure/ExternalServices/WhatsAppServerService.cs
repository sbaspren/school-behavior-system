using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using SchoolBehaviorSystem.Application.Interfaces;

namespace SchoolBehaviorSystem.Infrastructure.ExternalServices;

public class WhatsAppServerService : IWhatsAppServerService
{
    private readonly HttpClient _http;

    public WhatsAppServerService(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    // ★ Multi-Session API: GET /qr/status → {action:"wait", sessionId:"session_xxx"}
    // ثم GET /qr/status?sid=SESSION_ID → {action:"show_qr", qr:"data:image/png;base64,..."}
    // أو {action:"connected", phone:"966xxx"}
    public async Task<WhatsAppServerStatus> GetStatusAsync(string serverUrl)
    {
        var status = new WhatsAppServerStatus();
        if (string.IsNullOrEmpty(serverUrl)) return status;

        try
        {
            // نحاول /qr/status كـ ping — إذا رد السيرفر فهو متصل
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/qr/status");
            status.IsOnline = response.IsSuccessStatusCode;
        }
        catch
        {
            status.IsOnline = false;
        }

        return status;
    }

    /// <summary>
    /// ★ فحص هل جلسة رقم معين لا تزال حية على السيرفر
    /// يحاول إرسال لرقم وهمي — إذا رجع SESSION_NOT_FOUND (404) فالجلسة ميتة
    /// أي رد آخر (حتى خطأ 400/503) يعني الجلسة موجودة
    /// </summary>
    public async Task<bool> IsSessionAliveAsync(string serverUrl, string phoneNumber)
    {
        if (string.IsNullOrEmpty(serverUrl) || string.IsNullOrEmpty(phoneNumber)) return false;

        try
        {
            var cleanPhone = CleanPhone(phoneNumber);
            // نرسل لرقم وهمي "0" — السيرفر يفحص الجلسة أولاً قبل التحقق من الرقم
            var payload = new { sessionId = cleanPhone, phone = "0", message = "check" };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync($"{serverUrl.TrimEnd('/')}/send", content);

            // 404 = SESSION_NOT_FOUND → الجلسة ميتة
            if ((int)response.StatusCode == 404) return false;

            // أي رد آخر (200, 400, 503) → الجلسة موجودة
            return true;
        }
        catch
        {
            return false; // سيرفر غير متاح
        }
    }

    // ★ Multi-Session API: QR flow
    // 1. GET /qr/status → {action:"wait", sessionId:"session_xxx"} (ينشئ جلسة جديدة)
    // 2. GET /qr/status?sid=SESSION_ID → {action:"show_qr", qr:"data:image/png;base64,..."}
    public async Task<string?> GetQRCodeAsync(string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl)) return null;

        try
        {
            // Step 1: إنشاء جلسة جديدة
            var initResponse = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/qr/status");
            if (!initResponse.IsSuccessStatusCode) return null;

            var initText = await initResponse.Content.ReadAsStringAsync();
            var initJson = JsonSerializer.Deserialize<JsonElement>(initText);

            var sessionId = initJson.TryGetProperty("sessionId", out var sidProp)
                ? sidProp.GetString() : null;
            if (string.IsNullOrEmpty(sessionId)) return null;

            // Step 2: جلب الباركود بالـ sessionId — retry حتى يجهز
            for (int attempt = 0; attempt < 5; attempt++)
            {
                await Task.Delay(attempt == 0 ? 1500 : 2000);

                var qrResponse = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/qr/status?sid={sessionId}");
                if (!qrResponse.IsSuccessStatusCode) continue;

                var qrText = await qrResponse.Content.ReadAsStringAsync();
                var qrJson = JsonSerializer.Deserialize<JsonElement>(qrText);

                var action = qrJson.TryGetProperty("action", out var actProp)
                    ? actProp.GetString() : null;

                if (action == "show_qr" && qrJson.TryGetProperty("qr", out var qrProp)
                    && qrProp.ValueKind != JsonValueKind.Null)
                {
                    // نرفق الـ sessionId كـ suffix بعد |
                    return qrProp.GetString() + "|" + sessionId;
                }

                if (action != "wait") break; // خطأ أو حالة غير متوقعة
            }
        }
        catch { /* server unreachable */ }

        return null;
    }

    public async Task<List<string>> GetConnectedSessionsAsync(string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl)) return new();

        try
        {
            var status = await GetStatusAsync(serverUrl);
            return status.ConnectedPhones.Select(p => p.PhoneNumber).ToList();
        }
        catch
        {
            return new();
        }
    }

    // ★ Multi-Session API: POST /send مع { sessionId, phone, message }
    // sessionId = رقم الهاتف المرسل (مثال: 966501234567)
    public async Task<bool> SendMessageAsync(string serverUrl, string senderPhone, string recipientPhone, string message)
    {
        if (string.IsNullOrEmpty(serverUrl)) return false;

        try
        {
            var cleanSender = CleanPhone(senderPhone);
            var cleanRecipient = CleanPhone(recipientPhone);

            var payload = new { sessionId = cleanSender, phone = cleanRecipient, message };
            var json    = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync($"{serverUrl.TrimEnd('/')}/send", content);

            if (response.IsSuccessStatusCode) return true;

            var respText = await response.Content.ReadAsStringAsync();
            try
            {
                var respJson = JsonSerializer.Deserialize<JsonElement>(respText);
                if (respJson.TryGetProperty("success", out var s) && s.GetBoolean())
                    return true;
            }
            catch { /* not JSON */ }

            return false;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> PingAsync(string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl)) return false;

        try
        {
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/health");
            if (response.IsSuccessStatusCode) return true;

            // Fallback: try root endpoint
            response = await _http.GetAsync(serverUrl.TrimEnd('/'));
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// فصل جلسة من السيرفر الخارجي (best-effort).
    /// يجرب endpoints شائعة في whatsapp-web.js / baileys.
    /// 2xx = نجاح. 404 = الجلسة ميتة أصلاً (نعتبره نجاح).
    /// أي خطأ آخر = فشل، لكن لا نرمي exception — المستدعي يحذف من DB بكل الأحوال.
    /// </summary>
    public async Task<bool> DisconnectSessionAsync(string serverUrl, string phoneNumber)
    {
        if (string.IsNullOrEmpty(serverUrl) || string.IsNullOrEmpty(phoneNumber)) return false;

        var baseUrl = serverUrl.TrimEnd('/');
        var clean = new string(phoneNumber.Where(char.IsDigit).ToArray());

        // جرّب endpoints شائعة بالترتيب — أول نجاح يكفي.
        var attempts = new (HttpMethod Method, string Path)[]
        {
            (HttpMethod.Delete, $"/session/{clean}"),
            (HttpMethod.Post,   $"/session/{clean}/logout"),
            (HttpMethod.Post,   $"/logout/{clean}"),
            (HttpMethod.Delete, $"/sessions/{clean}"),
        };

        foreach (var (method, path) in attempts)
        {
            try
            {
                using var req = new HttpRequestMessage(method, $"{baseUrl}{path}");
                var response = await _http.SendAsync(req);
                // 2xx = نجاح، 404 = الجلسة غير موجودة (نعتبره نجاحاً منطقياً)
                if (response.IsSuccessStatusCode ||
                    response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return true;
            }
            catch
            {
                // نتجاهل ونجرّب الـ endpoint التالي
            }
        }

        return false;
    }

    // ★ تشخيص حالة السيرفر و QR
    public async Task<object> InspectQRAsync(string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl))
            return new { success = false, error = "رابط السيرفر غير مُعيّن" };

        try
        {
            // فحص /status — النقطة الرئيسية التي تحتوي على QR
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/status");
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "unknown";
            var statusCode = (int)response.StatusCode;
            var content = await response.Content.ReadAsStringAsync();

            var hasQR = false;
            var isConnected = false;
            string? phone = null;
            int? qrAge = null;

            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(content);
                isConnected = json.TryGetProperty("connected", out var c) && c.GetBoolean();
                hasQR = json.TryGetProperty("qr", out var q) && q.ValueKind != JsonValueKind.Null;
                phone = json.TryGetProperty("phone", out var p) && p.ValueKind != JsonValueKind.Null
                    ? p.GetString() : null;
                qrAge = json.TryGetProperty("qrAge", out var a) && a.ValueKind == JsonValueKind.Number
                    ? a.GetInt32() : null;
            }
            catch { /* not valid JSON */ }

            var preview = content.Length > 2000 ? content[..2000] : content;

            // فحص endpoints إضافية
            var extraEndpoints = new List<object>();
            foreach (var ep in new[] { "/health", "/pair" })
            {
                try
                {
                    var r = await _http.GetAsync($"{serverUrl.TrimEnd('/')}{ep}");
                    var ct = await r.Content.ReadAsStringAsync();
                    extraEndpoints.Add(new
                    {
                        endpoint = ep,
                        status   = (int)r.StatusCode,
                        contentType = r.Content.Headers.ContentType?.MediaType ?? "unknown",
                        contentLength = ct.Length,
                        preview  = ct.Length > 200 ? ct[..200] : ct,
                    });
                }
                catch (Exception ex)
                {
                    extraEndpoints.Add(new { endpoint = ep, status = "error", error = ex.Message });
                }
            }

            return new
            {
                success = true,
                serverUrl,
                statusCode,
                contentType,
                contentLength = content.Length,
                analysis = new { hasQR, isConnected, phone, qrAge },
                preview,
                extraEndpoints,
            };
        }
        catch (Exception e)
        {
            return new { success = false, error = e.Message };
        }
    }

    // ★ طلب رمز الاقتران (Pairing Code) — للتفعيل لاحقاً
    // يتطلب سيرفر يدعم /pair endpoint (مثل Baileys)
    public async Task<PairingCodeResult> RequestPairingCodeAsync(string serverUrl, string phoneNumber)
    {
        if (string.IsNullOrEmpty(serverUrl))
            return new PairingCodeResult { Success = false, Error = "رابط السيرفر غير مُعيّن" };

        try
        {
            var cleanPhone = CleanPhone(phoneNumber);
            var payload = new { phone = cleanPhone };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync($"{serverUrl.TrimEnd('/')}/pair", content);
            var respText = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                try
                {
                    var respJson = JsonSerializer.Deserialize<JsonElement>(respText);
                    var code = respJson.TryGetProperty("code", out var c) ? c.GetString() : null;
                    return new PairingCodeResult
                    {
                        Success = !string.IsNullOrEmpty(code),
                        Code = code,
                        Error = string.IsNullOrEmpty(code) ? "لم يتم الحصول على رمز الاقتران" : null
                    };
                }
                catch
                {
                    return new PairingCodeResult { Success = false, Error = "استجابة غير صالحة من السيرفر" };
                }
            }

            return new PairingCodeResult { Success = false, Error = $"فشل الطلب: {(int)response.StatusCode}" };
        }
        catch (Exception e)
        {
            return new PairingCodeResult { Success = false, Error = e.Message };
        }
    }

    // ★ Multi-Session API: فحص حالة QR session
    public async Task<QRPollResult> PollQRStatusAsync(string serverUrl, string sessionId)
    {
        if (string.IsNullOrEmpty(serverUrl) || string.IsNullOrEmpty(sessionId))
            return new QRPollResult { Status = "error", Error = "بيانات ناقصة" };

        try
        {
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/qr/status?sid={sessionId}");
            if (!response.IsSuccessStatusCode)
                return new QRPollResult { Status = "error", Error = $"HTTP {(int)response.StatusCode}" };

            var text = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(text);

            var action = json.TryGetProperty("action", out var actProp) ? actProp.GetString() : "unknown";

            if (action == "connected")
            {
                var phone = json.TryGetProperty("phone", out var phoneProp) ? phoneProp.GetString() : null;
                return new QRPollResult { Status = "connected", Phone = phone != null ? CleanPhone(phone) : null };
            }

            if (action == "show_qr")
            {
                var qr = json.TryGetProperty("qr", out var qrProp) ? qrProp.GetString() : null;
                return new QRPollResult { Status = "waiting", QrData = qr };
            }

            return new QRPollResult { Status = action ?? "unknown" };
        }
        catch (Exception ex)
        {
            return new QRPollResult { Status = "error", Error = ex.Message };
        }
    }

    private static string CleanPhone(string phone)
    {
        var clean = Regex.Replace(phone ?? "", @"\D", "");
        if (clean.StartsWith("05"))
            clean = "966" + clean[1..];
        else if (clean.StartsWith("5") && clean.Length == 9)
            clean = "966" + clean;
        else if (!clean.StartsWith("966") && clean.Length == 9)
            clean = "966" + clean;
        return clean;
    }
}
