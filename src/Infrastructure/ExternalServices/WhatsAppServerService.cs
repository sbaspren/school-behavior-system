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
        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    // ★ يستدعي GET /status من سيرفر Node.js (whatsapp-web.js)
    // الاستجابة: { connected, qr, phone, timestamp, qrAge }
    public async Task<WhatsAppServerStatus> GetStatusAsync(string serverUrl)
    {
        var status = new WhatsAppServerStatus();
        if (string.IsNullOrEmpty(serverUrl)) return status;

        try
        {
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/status");
            if (!response.IsSuccessStatusCode)
            {
                status.IsOnline = false;
                return status;
            }

            status.IsOnline = true;
            var content = await response.Content.ReadAsStringAsync();

            var json = JsonSerializer.Deserialize<JsonElement>(content);

            var connected = json.TryGetProperty("connected", out var connProp) && connProp.GetBoolean();

            if (connected)
            {
                // phone field contains the connected phone number
                var phone = json.TryGetProperty("phone", out var phoneProp)
                            && phoneProp.ValueKind != JsonValueKind.Null
                    ? phoneProp.GetString() ?? ""
                    : "";

                if (!string.IsNullOrEmpty(phone))
                {
                    status.ConnectedPhones.Add(new ConnectedPhone
                    {
                        PhoneNumber = CleanPhone(phone),
                        IsConnected = true
                    });
                }
            }
        }
        catch
        {
            status.IsOnline = false;
        }

        return status;
    }

    // ★ يجلب الباركود من GET /status → حقل "qr" (data URL base64)
    // السيرفر يضع الباركود في /status وليس في endpoint منفصل
    public async Task<string?> GetQRCodeAsync(string serverUrl)
    {
        if (string.IsNullOrEmpty(serverUrl)) return null;

        try
        {
            var response = await _http.GetAsync($"{serverUrl.TrimEnd('/')}/status");
            if (!response.IsSuccessStatusCode) return null;

            var text = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(text);

            // QR is a base64 data URL in the "qr" field, null when already connected
            if (json.TryGetProperty("qr", out var qrProp) && qrProp.ValueKind != JsonValueKind.Null)
            {
                return qrProp.GetString();
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

    // ★ يرسل رسالة عبر POST /send مع { phone, message } في body
    // سيرفر whatsapp-web.js لا يدعم تحديد المرسل (جلسة واحدة فقط)
    public async Task<bool> SendMessageAsync(string serverUrl, string senderPhone, string recipientPhone, string message)
    {
        if (string.IsNullOrEmpty(serverUrl)) return false;

        try
        {
            var cleanRecipient = CleanPhone(recipientPhone);

            var payload = new { phone = cleanRecipient, message };
            var json    = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // POST /send — السيرفر يستخدم الجلسة الوحيدة المتصلة
            var response = await _http.PostAsync($"{serverUrl.TrimEnd('/')}/send", content);

            if (response.IsSuccessStatusCode) return true;

            // بعض السيرفرات تُرجع JSON مع success field
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
