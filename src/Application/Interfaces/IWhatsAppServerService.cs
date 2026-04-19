namespace SchoolBehaviorSystem.Application.Interfaces;

public interface IWhatsAppServerService
{
    Task<WhatsAppServerStatus> GetStatusAsync(string serverUrl);
    Task<string?> GetQRCodeAsync(string serverUrl);
    Task<List<string>> GetConnectedSessionsAsync(string serverUrl);
    Task<bool> SendMessageAsync(string serverUrl, string senderPhone, string recipientPhone, string message);
    Task<bool> PingAsync(string serverUrl);
    Task<object> InspectQRAsync(string serverUrl);

    /// <summary>
    /// طلب رمز اقتران (Pairing Code) لربط الواتساب برقم الجوال بدلاً من QR.
    /// جاهز للتفعيل لاحقاً — يتطلب سيرفر يدعم /pair endpoint.
    /// </summary>
    Task<PairingCodeResult> RequestPairingCodeAsync(string serverUrl, string phoneNumber);

    /// <summary>
    /// فحص حالة QR session — هل تم المسح؟
    /// </summary>
    Task<QRPollResult> PollQRStatusAsync(string serverUrl, string sessionId);

    /// <summary>
    /// فحص هل جلسة رقم معين لا تزال حية على السيرفر.
    /// يستخدم محاولة إرسال وهمية — 404 = ميتة، غيره = حية.
    /// </summary>
    Task<bool> IsSessionAliveAsync(string serverUrl, string phoneNumber);

    /// <summary>
    /// فصل جلسة واتساب من السيرفر الخارجي — best-effort.
    /// يحاول endpoints متعددة (DELETE /session، POST /logout) ويعتبر "success"
    /// أي رد 2xx أو 404 (الجلسة ميتة أصلاً).
    /// لا يرمي exception — السبب: قد يفشل لأن السيرفر لا يدعم هذا الـ endpoint،
    /// لكن يجب أن لا يمنع حذف السجل من قاعدة بياناتنا.
    /// </summary>
    Task<bool> DisconnectSessionAsync(string serverUrl, string phoneNumber);
}

public class WhatsAppServerStatus
{
    public bool IsOnline { get; set; }
    public List<ConnectedPhone> ConnectedPhones { get; set; } = new();
}

public class ConnectedPhone
{
    public string PhoneNumber { get; set; } = "";
    public bool IsConnected { get; set; }
}

public class PairingCodeResult
{
    public bool Success { get; set; }
    public string? Code { get; set; }
    public string? Error { get; set; }
}

public class QRPollResult
{
    public string Status { get; set; } = "unknown"; // "waiting", "connected", "error"
    public string? Phone { get; set; }
    public string? QrData { get; set; }
    public string? Error { get; set; }
}
