import React, { useState, useEffect, useCallback, useRef } from 'react';
import MI from '../components/shared/MI';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import { whatsappApi } from '../api/whatsapp';
import { smsApi } from '../api/sms';

// ===== Interfaces =====
interface StatusResult {
  connected: boolean;
  phone: string | null;
  primaryPhone: string | null;
  hasPrimary: boolean;
  needSetup: boolean;
  sessions: any[];
  allSessions: any[];
  stage: string;
  effectiveStage: string;
  whatsappMode: string;
  connectedPhones?: { phoneNumber: string; isConnected: boolean }[];
  canUseAdminWhatsApp?: boolean;
  adminHasWhatsApp?: boolean;
  scenario?: number; // 1-4
  error?: string;
}

interface StatsResult {
  connectedPhones: number;
  savedPhones: number;
  totalMessages: number;
}

// ===== Constants =====
const USER_TYPES = ['وكيل', 'مدير', 'موجه'];
const STAGES = [
  { id: 'ابتدائي', label: 'المرحلة الابتدائية', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'متوسط',   label: 'المرحلة المتوسطة',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'ثانوي',   label: 'المرحلة الثانوية',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
];

function getVisibleStages(role?: string, scopes?: string[]) {
  if (role === 'Deputy' && scopes && scopes.length > 0) {
    return STAGES.filter(s => scopes.some(scope => scope === s.id || scope.includes(s.id)));
  }
  return STAGES;
}

function getStageInfo(stageId: string, _waMode: string) {
  if (stageId === 'all') return { label: 'جميع المراحل', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  return STAGES.find(s => s.id === stageId) || STAGES[1];
}

// ★ MainView types — تدفق الصفحة الرئيسية مطابق لـ JS_WhatsApp.html
type MainView =
  | 'loading' | 'error'
  | 'connected' | 'disconnected'
  | 'qr-scan' | 'qr-success';

// ===== Main Component =====
const WhatsAppPage: React.FC = () => {
  // User scope for stage filtering
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const userRole = storedUser?.role;
  const userScopeValue = storedUser?.scopeValue || '';
  const userScopes = userScopeValue ? userScopeValue.split(',').filter(Boolean) : [];
  // المرحلة الحالية — تلقائية حسب صلاحية المستخدم
  // الأدمن ← 'all' (رقم موحد)، الوكيل ← مرحلته فقط
  const [currentStage] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role === 'Admin') return 'all';
    const scopes = user?.scopeValue?.split(',').filter(Boolean) || [];
    const vs = getVisibleStages(user?.role, scopes);
    return vs.length > 0 ? vs[0].id : 'متوسط';
  });

  // حالة الصفحة: 'loading' | 'main' | 'settings'
  const [pageView, setPageView] = useState<'loading' | 'main' | 'settings'>('loading');

  // بيانات الحالة — من GET /whatsapp/status
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [mainView, setMainView] = useState<MainView>('loading');

  // QR
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrConnectedPhone, setQrConnectedPhone] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPhonesBeforeQR = useRef<string[]>([]);

  // Settings
  const [serverUrl, setServerUrl] = useState('');
  const [serviceStatus, setServiceStatus] = useState('مفعل');
  const [waMode, setWaMode] = useState('PerStage');
  const [smsApiToken, setSmsApiToken] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);

  // Scenario
  const [scenario, setScenario] = useState(1);
  const [deputyChoice, setDeputyChoice] = useState<'school' | 'own' | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms'>('whatsapp');

  // SMS
  const [smsProvider, setSmsProvider] = useState('');
  const [smsSenderName, setSmsSenderName] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestSending, setSmsTestSending] = useState(false);

  // General
  const [actionLoading, setActionLoading] = useState(false);

  // =========================================================================
  // Load Status (نقطة الدخول الرئيسية — مطابق loadWhatsAppStatus + handleStatusResponse)
  // =========================================================================
  const loadStatus = useCallback(async () => {
    setPageView('loading');
    try {
      const res = await whatsappApi.getStatus(currentStage);
      const data = res.data?.data as StatusResult;
      if (!data) { setMainView('error'); setPageView('main'); return; }

      setStatus(data);
      if (data.scenario) setScenario(data.scenario);

      // ★ مطابق handleStatusResponse — يقرر أي واجهة يعرض
      if (data.connected && data.sessions?.length > 0) {
        setMainView('connected');
        loadStats();
      } else {
        setMainView('disconnected');
      }
      setPageView('main');
    } catch {
      toast.error('فشل تحميل حالة الواتساب');
      setMainView('error');
      setPageView('main');
    }
  }, [currentStage]);

  const loadStats = useCallback(async () => {
    try {
      const res = await whatsappApi.getStats(currentStage);
      const d = res.data?.data;
      if (d?.stats) setStats(d.stats);
    } catch { /* ignore */ }
  }, [currentStage]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await whatsappApi.getSettings();
      const d = res.data?.data;
      if (d) {
        setServerUrl(d.serverUrl || '');
        setServiceStatus(d.serviceStatus || 'مفعل');
        setWaMode(d.whatsAppMode || 'PerStage');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); loadSettings(); }, [loadStatus, loadSettings]);
  useEffect(() => { return () => { stopQRPolling(); }; }, []);

  const stageInfo = getStageInfo(currentStage, status?.whatsappMode || waMode);

  // =========================================================================
  // QR Pairing — Multi-Session API
  // Flow: getQR → {qrData, sessionId} → pollQR(sessionId) كل 5 ثوان
  // =========================================================================
  const openQRPage = async () => {
    stopQRPolling();
    setMainView('qr-scan');
    setQrImage(null);
    setQrConnectedPhone(null);
    setQrSessionId(null);

    try {
      const res = await whatsappApi.getQR();
      const d = res.data?.data;
      if (d?.hasQR && d.qrData) {
        setQrImage(d.qrData);
        if (d.sessionId) setQrSessionId(d.sessionId);
        startQRPolling(d.sessionId);
      } else {
        toast.error('لم يتم الحصول على الباركود — تأكد من رابط السيرفر');
        setMainView(status?.connected ? 'connected' : 'disconnected');
      }
    } catch {
      toast.error('فشل الاتصال بالسيرفر');
      setMainView(status?.connected ? 'connected' : 'disconnected');
    }
  };

  // ★ startQRPolling — polling كل 5 ثوان باستخدام sessionId + timeout 3 دقائق
  const startQRPolling = (sessionId?: string) => {
    stopQRPolling();
    if (!sessionId) return;

    // Poll QR status every 5s
    pollRef.current = setInterval(async () => {
      try {
        const res = await whatsappApi.pollQR(sessionId);
        const d = res.data?.data;

        if (d?.status === 'connected' && d.phone) {
          stopQRPolling();
          // حفظ الرقم الجديد تلقائياً
          try {
            await whatsappApi.syncAndSave({ phoneNumber: d.phone, stage: currentStage, userType: 'وكيل' });
          } catch { /* ignore */ }
          setQrConnectedPhone(d.phone);
          toast.success(`تم ربط الرقم ${d.phone} بنجاح!`);
          loadStatus();
        } else if (d?.status === 'waiting' && d.qrData) {
          // تحديث الـ QR بالصورة الجديدة
          setQrImage(d.qrData);
        }
      } catch { /* ignore */ }
    }, 5000);

    // Timeout after 3 minutes
    qrTimeoutRef.current = setTimeout(() => {
      if (pollRef.current) {
        stopQRPolling();
        toast.error('انتهى وقت الانتظار — اضغط لإعادة المحاولة');
        setMainView(status?.connected ? 'connected' : 'disconnected');
      }
    }, 180000);
  };

  const stopQRPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (qrRefreshRef.current) { clearInterval(qrRefreshRef.current); qrRefreshRef.current = null; }
    if (qrTimeoutRef.current) { clearTimeout(qrTimeoutRef.current); qrTimeoutRef.current = null; }
  };

  // =========================================================================
  // Phone Management
  // =========================================================================
  const handleSetPrimary = async (id: number, phone: string) => {
    if (!window.confirm(`تعيين ${phone} كرقم رئيسي؟`)) return;
    try {
      await whatsappApi.setPrimary(id);
      toast.success('تم التعيين');
      loadStatus();
    } catch { toast.error('فشل التعيين'); }
  };

  const handleDeletePhone = async (id: number, phone: string) => {
    if (!window.confirm(`سيتم فصل الرقم ${phone} نهائياً من واتساب وإزالة الجهاز المرتبط.\n\nهل أنت متأكد؟`)) return;
    try {
      await whatsappApi.deleteSession(id);
      setDeputyChoice(null);
      toast.success('تم فصل الرقم نهائياً');
      loadStatus();
    } catch { toast.error('فشل فصل الرقم'); }
  };

  // =========================================================================
  // Settings
  // =========================================================================
  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      await whatsappApi.saveSettings({ serverUrl, serviceStatus, whatsAppMode: waMode, ...(smsApiToken ? { smsApiToken } : {}) });
      toast.success('تم حفظ الإعدادات');
      loadSettings();
    } catch { toast.error('فشل الحفظ'); }
    finally { setSettingsLoading(false); }
  };

  const handleInspectQR = async () => {
    setInspecting(true);
    try {
      const res = await whatsappApi.inspectQR();
      setInspectResult(JSON.stringify(res.data?.data, null, 2));
    } catch { setInspectResult('فشل الفحص'); }
    finally { setInspecting(false); }
  };

  const handlePing = async () => {
    toast('جاري إيقاظ السيرفر...');
    try {
      const res = await whatsappApi.ping();
      if (res.data?.data?.isOnline) toast.success('السيرفر متصل');
      else toast.error('السيرفر غير متصل');
    } catch { toast.error('فشل الاتصال'); }
  };

  // =========================================================================
  // RENDER — Settings Page
  // =========================================================================
  if (pageView === 'settings') {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => { setPageView('main'); loadStatus(); }} style={{ ...btnStyle('#f3f4f6', '#374151'), padding: '8px 16px' }}>→ رجوع</button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>إعدادات الخدمة</h2>
        </div>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gap: '16px', maxWidth: '600px' }}>
            <div>
              <label style={labelStyle}>حالة الخدمة</label>
              <select value={serviceStatus} onChange={e => setServiceStatus(e.target.value)} style={inputStyle}>
                <option value="مفعل">مفعل</option>
                <option value="معطل">معطل</option>
              </select>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>عند التعطيل لن تُرسل أي رسائل واتساب أو SMS</div>
            </div>

            {/* نمط واتساب أولياء الأمور */}
            <div>
              <label style={labelStyle}>نمط واتساب أولياء الأمور</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {[
                  { value: 'PerStage', label: 'أرقام متعددة', desc: 'لكل مرحلة رقم واتساب مخصص', icon: 'smartphone' },
                  { value: 'Unified', label: 'رقم واحد للمدرسة', desc: 'رقم واتساب المدير لجميع أولياء الأمور', icon: 'phone_android' },
                ].map(opt => (
                  <label key={opt.value} style={{
                    flex: 1, display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px', borderRadius: '10px', cursor: 'pointer',
                    border: `2px solid ${waMode === opt.value ? '#25d366' : '#e5e7eb'}`,
                    background: waMode === opt.value ? '#f0fdf4' : '#fff',
                  }}>
                    <input type="radio" checked={waMode === opt.value} onChange={() => setWaMode(opt.value)} style={{ marginTop: '3px' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: waMode === opt.value ? '#16a34a' : '#9ca3af' }}>{opt.icon}</span>
                        <span style={{ fontWeight: 700, color: waMode === opt.value ? '#15803d' : '#374151', fontSize: '13px' }}>{opt.label}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleSaveSettings} disabled={settingsLoading} style={{
              ...btnStyle('#25d366', '#fff'), opacity: settingsLoading ? 0.6 : 1, width: 'fit-content',
            }}>{settingsLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Main Page (مطابق تماماً لتدفق JS_WhatsApp.html)
  // =========================================================================
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ===== Header ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>chat</span>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', margin: 0 }}>أدوات التواصل</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>واتساب والرسائل النصية</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {userRole !== 'Admin' && (
            <div style={{
              background: stageInfo.bg, color: stageInfo.color, padding: '8px 16px', borderRadius: '12px',
              fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              border: `1px solid ${stageInfo.border}`,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>apartment</span> {stageInfo.label}
            </div>
          )}
          <button onClick={() => setPageView('settings')} style={{ ...btnStyle('#f3f4f6', '#374151'), padding: '8px 12px', fontSize: '12px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>settings</span></button>
        </div>
      </div>

      {/* ===== تبويبات: واتساب | SMS ===== */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('whatsapp')} style={{
          flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: activeTab === 'whatsapp' ? '#25d366' : 'transparent',
          color: activeTab === 'whatsapp' ? '#fff' : '#6b7280',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span> واتساب
        </button>
        <button onClick={() => setActiveTab('sms')} style={{
          flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: activeTab === 'sms' ? '#2563eb' : 'transparent',
          color: activeTab === 'sms' ? '#fff' : '#6b7280',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sms</span> رسائل SMS
        </button>
      </div>

      {/* ===== محتوى واتساب ===== */}
      {activeTab === 'whatsapp' && <>
      {/* ===== Main Card ===== */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Banner */}
        <div style={{ background: 'linear-gradient(to left, #25d366, #128c7e)', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
            <span style={{ fontSize: '13px' }}>
              {scenario === 1 && 'رقم واحد رئيسي — أنت المدير الوحيد'}
              {scenario === 2 && (userRole === 'Admin' ? 'رقم واحد رئيسي — الوكلاء يرسلون من رقم المدرسة' : `متصل برقم المدرسة الرئيسي — ${stageInfo.label}`)}
              {scenario === 3 && (userRole === 'Admin' ? 'رقم رئيسي + الوكلاء يختارون رقمهم' : `${stageInfo.label} — اختر رقم المدرسة أو رقمك`)}
              {scenario === 4 && (userRole === 'Admin' ? 'كل وكيل يربط رقمه بشكل مستقل' : `${stageInfo.label} — اربط رقمك الخاص`)}
            </span>
          </div>
        </div>

        {/* Content — 2 columns: instructions (left) + main (right) */}
        <div style={{ display: 'flex', minHeight: '450px' }}>
          {/* ★ Instructions Column — مطابق سطر 81-108 */}
          <div style={{ width: '50%', padding: '24px', background: '#f9fafb', borderLeft: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '24px', background: '#25d366', borderRadius: '4px', display: 'inline-block' }} />
              تعليمات ربط الواتساب
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                'اضغط "ربط الرقم"',
                'افتح واتساب على الجوال → "الأجهزة المرتبطة"',
                'اضغط "ربط جهاز" وامسح الباركود',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{
                    width: '24px', height: '24px', background: '#25d366', color: '#fff', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: '24px' }}>{step}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px' }}>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>star</span> <strong>مهم:</strong> آخر رقم يُمسح بالباركود يصبح الرقم الرئيسي تلقائياً
              </p>
            </div>
          </div>

          {/* ★ Main Content Column */}
          <div style={{ width: '50%', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            {/* Loading */}
            {(pageView === 'loading' || mainView === 'loading') && <LoadingSpinner text="جاري التحميل..." />}

            {/* ★ Connected State — مطابق showConnectedState سطر 247-277 */}
            {mainView === 'connected' && status && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>check_circle</span>} bg="#dcfce7" size={80} />
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>متصل بنجاح!</h3>
                <p style={{ fontSize: '18px', color: '#374151', fontWeight: 600, direction: 'ltr' as const, margin: '0 0 4px' }}>
                  {status.primaryPhone || status.phone}
                </p>
                {status.hasPrimary ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: '#fffbeb', color: '#b45309', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle' }}>star</span> الرقم الرئيسي
                  </span>
                ) : (
                  <span style={{ padding: '4px 12px', background: '#f3f4f6', color: '#6b7280', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>متصل</span>
                )}
                <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
                  <button onClick={() => openQRPage()} style={{ ...btnStyle('#25d366', '#fff'), width: '100%' }}>
                    <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> تغيير الرقم الرئيسي
                  </button>
                  <button onClick={() => loadStatus()} style={{ ...btnStyle('#f3f4f6', '#374151'), width: '100%' }}>
                    <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>refresh</span> تحديث الحالة
                  </button>
                  <button onClick={async () => {
                    const phone = status.primaryPhone || status.phone;
                    if (!window.confirm(`سيتم فصل الرقم ${phone} نهائياً من واتساب وإزالة الجهاز المرتبط.\n\nهل أنت متأكد؟`)) return;
                    try {
                      const session = (status.allSessions || status.sessions || []).find((s: any) => s.phone === phone || s.phoneNumber === phone);
                      if (session?.id) {
                        await whatsappApi.deleteSession(session.id);
                      }
                      setDeputyChoice(null);
                      toast.success('تم فصل الرقم نهائياً');
                      loadStatus();
                    } catch { toast.error('فشل فصل الرقم'); }
                  }} style={{ ...btnStyle('#fef2f2', '#dc2626'), width: '100%', border: '1px solid #fca5a5' }}>
                    <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>logout</span>
                    {userRole === 'Deputy' && scenario === 3 ? 'فصل رقمي والعودة لرقم المدرسة' : 'فصل الرقم'}
                  </button>
                </div>
              </div>
            )}

            {/* ★ Disconnected State — يتكيف بحسب السيناريو والدور */}
            {mainView === 'disconnected' && (
              <div style={{ textAlign: 'center', width: '100%' }}>

                {/* ═══ سيناريو 1 + 4 للأدمن، أو سيناريو 3+4 للوكيل (ربط رقم خاص) ═══ */}
                {((userRole === 'Admin' && (scenario === 1 || scenario === 4)) ||
                  (userRole === 'Deputy' && scenario === 4) ||
                  (userRole === 'Deputy' && scenario === 3 && deputyChoice === 'own')) && (
                  <>
                    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>link</span>} bg="#ffedd5" size={80} />
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                      {userRole === 'Admin' && scenario === 1 && 'ربط رقم الواتساب'}
                      {userRole === 'Admin' && scenario === 4 && 'ربط رقمك (اختياري)'}
                      {userRole === 'Deputy' && 'ربط رقمك الخاص'}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                      {scenario === 1 && 'رقم واحد لجميع مراسلات المدرسة'}
                      {scenario === 4 && userRole === 'Admin' && 'يمكنك ربط رقمك للإرسال، أو ترك المهمة للوكلاء'}
                      {scenario === 4 && userRole === 'Deputy' && `اربط رقمك لمراسلات ${stageInfo.label}`}
                      {scenario === 3 && deputyChoice === 'own' && `اربط رقمك الخاص لمراسلات ${stageInfo.label}`}
                    </p>
                    <button onClick={() => openQRPage()} disabled={actionLoading} style={{
                      ...btnStyle('#25d366', '#fff'), width: '100%', opacity: actionLoading ? 0.6 : 1, padding: '14px 24px',
                    }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> ربط الرقم</button>
                    {scenario === 3 && deputyChoice === 'own' && (
                      <button onClick={() => setDeputyChoice(null)} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
                        ← رجوع للخيارات
                      </button>
                    )}
                  </>
                )}

                {/* ═══ سيناريو 2: الوكيل يستخدم رقم المدرسة (لا يربط) ═══ */}
                {userRole === 'Deputy' && scenario === 2 && (
                  <>
                    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>check_circle</span>} bg="#dcfce7" size={80} />
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                      متصل برقم المدرسة
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                      يمكنك إرسال الرسائل لأولياء أمور {stageInfo.label} من رقم المدرسة الرئيسي
                    </p>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                      <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: 24 }}>phone_forwarded</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#15803d', fontSize: 14 }}>الإرسال من رقم المدرسة</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>الرسائل تُرسل تلقائياً من الرقم الرئيسي المربوط من المدير</p>
                      </div>
                    </div>
                  </>
                )}

                {/* ═══ سيناريو 3: الوكيل يختار (رقم المدرسة أو رقمه) ═══ */}
                {userRole === 'Deputy' && scenario === 3 && !deputyChoice && (
                  <>
                    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>swap_horiz</span>} bg="#ede9fe" size={80} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>اختر طريقة الإرسال</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>لمراسلات {stageInfo.label}</p>
                    <div style={{ display: 'grid', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
                      <button onClick={() => setDeputyChoice('school')} style={{
                        ...btnStyle('#25d366', '#fff'), width: '100%', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>apartment</span>
                        استخدام رقم المدرسة
                      </button>
                      <button onClick={() => setDeputyChoice('own')} style={{
                        ...btnStyle('#2563eb', '#fff'), width: '100%', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>smartphone</span>
                        ربط رقمي الخاص
                      </button>
                    </div>
                  </>
                )}

                {/* ═══ سيناريو 3: الوكيل اختار رقم المدرسة ═══ */}
                {userRole === 'Deputy' && scenario === 3 && deputyChoice === 'school' && (
                  <>
                    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>check_circle</span>} bg="#dcfce7" size={80} />
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                      متصل برقم المدرسة
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                      الرسائل تُرسل من الرقم الرئيسي للمدرسة
                    </p>
                    <button onClick={() => setDeputyChoice(null)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
                      ← تغيير الاختيار
                    </button>
                  </>
                )}

                {/* ═══ سيناريو 2+3 للأدمن (رقم رئيسي مربوط مسبقاً) ═══ */}
                {userRole === 'Admin' && (scenario === 2 || scenario === 3) && (
                  <>
                    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>link</span>} bg="#ffedd5" size={80} />
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>لا يوجد رقم رئيسي</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>اربط الرقم الرئيسي للمدرسة</p>
                    <button onClick={() => openQRPage()} disabled={actionLoading} style={{
                      ...btnStyle('#25d366', '#fff'), width: '100%', opacity: actionLoading ? 0.6 : 1, padding: '14px 24px',
                    }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> ربط الرقم الرئيسي</button>
                  </>
                )}

              </div>
            )}

            {/* ★ QR Scan — مطابق openQRPage + showQRInline سطر 368-457 */}
            {mainView === 'qr-scan' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                {qrImage ? (
                  <>
                    <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '20px', display: 'inline-block', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                        <img src={qrImage} alt="QR Code" style={{ width: '260px', height: '260px', imageRendering: 'pixelated', display: 'block' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', color: '#15803d' }}>
                        <span style={{ fontSize: '16px' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span></span>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>امسح الباركود من واتساب</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#16a34a', margin: '4px 0 0' }}>الإعدادات ← الأجهزة المرتبطة ← ربط جهاز</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '8px', height: '8px', background: '#25d366', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                      <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>جاري انتظار المسح...</p>
                    </div>
                  </>
                ) : (
                  <LoadingSpinner text="يتم الآن تكوين الاتصال... يرجى الانتظار لحظات" />
                )}
                <button onClick={() => { stopQRPolling(); setMainView(status?.connected ? 'connected' : 'disconnected'); }} style={{ ...btnStyle('#f3f4f6', '#374151'), marginTop: '8px' }}>إلغاء</button>
              </div>
            )}

            {/* ★ QR Success — مطابق showQRSuccess سطر 490-513 */}
            {mainView === 'qr-success' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <IconCircle emoji={<span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>contact_phone</span>} bg="#dcfce7" size={80} border="#86efac" />
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>متصل بنجاح!</h3>
                <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '20px', display: 'inline-block', marginBottom: '16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, direction: 'ltr' as const, marginBottom: '4px' }}>{qrConnectedPhone}</div>
                  <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>تم ربط الحساب بنجاح</div>
                </div>
                <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>check_circle</span> تم الاتصال بنجاح مع واتساب</p>
                <button onClick={() => loadStatus()} style={{ ...btnStyle('#25d366', '#fff'), padding: '12px 32px' }}>الذهاب للصفحة الرئيسية ←</button>
              </div>
            )}

            {/* Error */}
            {mainView === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '28px' }}>cancel</span>} bg="#fef2f2" />
                <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '12px' }}>فشل تحميل الحالة</p>
                <button onClick={() => loadStatus()} style={btnStyle('#25d366', '#fff')}>إعادة المحاولة</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Phones List — مطابق wa-phones-card سطر 122-128 ===== */}
      {status && (status.allSessions?.length > 0 || status.sessions?.length > 0) &&
       !['qr-scan', 'qr-success'].includes(mainView) && (
        <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> أرقام {stageInfo.label}
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {(status.allSessions || status.sessions || []).map((session: any, i: number) => {
              const isConnected = session.status === 'متصل';
              const isPrimary = session.isPrimary;
              return (
                <div key={session.id || i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px',
                  background: isPrimary ? '#fffbeb' : '#f9fafb', borderRadius: '12px',
                  border: isPrimary ? '1px solid #fde68a' : '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: isConnected ? '#dcfce7' : '#fef2f2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    }}>{isConnected ? <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span dir="ltr">{session.phone || session.phoneNumber}</span>
                        {isPrimary && (
                          <span style={{ padding: '2px 8px', background: '#fffbeb', color: '#b45309', fontSize: '10px', borderRadius: '100px', fontWeight: 700 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '10px', verticalAlign: 'middle' }}>star</span> رئيسي
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>{session.userType || '-'} • {session.messageCount || 0} رسالة</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                      background: isConnected ? '#dcfce7' : '#fef2f2',
                      color: isConnected ? '#16a34a' : '#dc2626',
                    }}>{session.status || session.connectionStatus}</span>
                    {!isPrimary && isConnected && session.id && (
                      <button onClick={() => handleSetPrimary(session.id, session.phone || session.phoneNumber)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' }} title="تعيين كرئيسي"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>star</span></button>
                    )}
                    {session.id && (
                      <button onClick={() => handleDeletePhone(session.id, session.phone || session.phoneNumber)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', color: '#dc2626' }} title="حذف"><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>delete</span></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Stats — مطابق wa-stats-card سطر 130-149 ===== */}
      {stats && mainView === 'connected' && (
        <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>bar_chart</span> إحصائيات الإرسال - {stageInfo.label}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <StatCard label="أرقام متصلة" value={stats.connectedPhones} color="#2563eb" bg="#eff6ff" />
            <StatCard label="إجمالي الرسائل" value={stats.totalMessages} color="#16a34a" bg="#f0fdf4" />
            <StatCard label="أرقام مسجلة" value={stats.savedPhones} color="#7c3aed" bg="#f5f3ff" />
          </div>
        </div>
      )}

      {/* ===== Stage Teachers — معلمين المرحلة ===== */}
      {(userRole === 'Admin' || userRole === 'Deputy') && mainView === 'connected' && (
        <StageTeachersSection currentStage={currentStage} status={status} />
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      </>}

      {/* ===== محتوى SMS ===== */}
      {activeTab === 'sms' && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Banner */}
          <div style={{ background: 'linear-gradient(to left, #2563eb, #1d4ed8)', padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sms</span>
              <span style={{ fontSize: 13 }}>ربط مزود خدمة الرسائل النصية SMS لإرسال الرسائل لأولياء الأمور</span>
            </div>
          </div>

          <div style={{ display: 'flex', minHeight: 400 }}>
            {/* تعليمات SMS */}
            <div style={{ width: '50%', padding: 24, background: '#f9fafb', borderLeft: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 24, background: '#2563eb', borderRadius: 4, display: 'inline-block' }} />
                خطوات ربط خدمة SMS
              </h3>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { title: 'اشترك مع مزود خدمة SMS', desc: 'مثل Madar أو Unifonic أو Taqnyat أو أي مزود آخر' },
                  { title: 'ادخل لوحة تحكم المزود', desc: 'ستجد فيها: رابط API، رمز API Key، واسم المرسل' },
                  { title: 'انسخ البيانات الثلاثة وأدخلها هنا', desc: 'رابط API + رمز API Key + اسم المرسل' },
                  { title: 'اضغط "حفظ" ثم "إرسال تجريبي"', desc: 'أدخل رقم جوالك وتأكد أن الرسالة وصلت' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{
                      width: 26, height: 26, background: '#2563eb', color: '#fff', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', display: 'block' }}>{step.title}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{step.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 6px', fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>warning</span>{' '}
                  في حالة فشل الإرسال:
                </p>
                <ul style={{ fontSize: 11, color: '#92400e', margin: 0, paddingRight: 16 }}>
                  <li>تأكد من صحة رابط API ورمز API Key</li>
                  <li>تأكد من اسم المرسل المسجل لدى المزود</li>
                  <li>تحقق من رصيدك لدى مزود الخدمة</li>
                  <li>تواصل مع الدعم الفني لمزود الخدمة</li>
                </ul>
              </div>
            </div>

            {/* إعدادات SMS */}
            <div style={{ width: '50%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>settings</span>
                إعدادات مزود الخدمة
              </h3>

              {/* رابط API */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  رابط API <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(من لوحة تحكم المزود)</span>
                </label>
                <input type="text" value={smsProvider} onChange={e => setSmsProvider(e.target.value)}
                  placeholder="مثال: https://app.mobile.net.sa/api/v1/send"
                  style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box' as const, fontSize: 13, direction: 'ltr' as const }} />
              </div>

              {/* رمز API */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  رمز API Key <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(من لوحة تحكم المزود)</span>
                </label>
                <input type="text" value={smsApiToken} onChange={e => setSmsApiToken(e.target.value)}
                  placeholder="الصق رمز API هنا..."
                  style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box' as const, fontSize: 13, direction: 'ltr' as const }} />
              </div>

              {/* اسم المرسل */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  اسم المرسل <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(من لوحة تحكم المزود)</span>
                </label>
                <input type="text" value={smsSenderName} onChange={e => setSmsSenderName(e.target.value)}
                  placeholder="مثال: School1"
                  style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box' as const, fontSize: 13, direction: 'ltr' as const }} />
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>الاسم المسجل لدى مزود الخدمة — يظهر كمرسل عند المستقبل</p>
              </div>

              {/* أزرار */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={async () => {
                  setSmsSaving(true);
                  try {
                    await whatsappApi.saveSettings({ smsApiToken: smsApiToken, smsSenderName: smsSenderName });
                    toast.success('تم حفظ إعدادات SMS');
                  } catch { toast.error('فشل حفظ الإعدادات'); }
                  finally { setSmsSaving(false); }
                }} disabled={smsSaving} style={{
                  flex: 1, padding: '12px 20px', background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: smsSaving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  {smsSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>

              {/* إرسال تجريبي */}
              {smsApiToken && (
                <div style={{ padding: 14, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>إرسال رسالة تجريبية</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="tel" value={smsTestPhone} onChange={e => setSmsTestPhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      style={{ flex: 1, height: 40, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' as const, fontSize: 14, direction: 'ltr' as const }} />
                    <button onClick={async () => {
                      if (!smsTestPhone || !/^05\d{8}$/.test(smsTestPhone)) { toast.error('أدخل رقم جوال صحيح يبدأ بـ 05'); return; }
                      setSmsTestSending(true);
                      try {
                        const res = await smsApi.send(smsTestPhone, 'رسالة تجريبية من نظام شؤون الطلاب — الربط يعمل بنجاح ✅');
                        if (res.data?.data?.success) toast.success('تم إرسال الرسالة التجريبية بنجاح!');
                        else toast.error(res.data?.data?.error || 'فشل الإرسال — تحقق من رمز API والرصيد');
                      } catch { toast.error('فشل الاتصال بمزود الخدمة'); }
                      finally { setSmsTestSending(false); }
                    }} disabled={smsTestSending} style={{
                      padding: '0 20px', height: 40, background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: smsTestSending ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                      {smsTestSending ? 'جاري الإرسال...' : 'إرسال تجريبي'}
                    </button>
                  </div>
                </div>
              )}

              {/* حالة */}
              <div style={{
                padding: 12, borderRadius: 10,
                background: smsApiToken ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${smsApiToken ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: smsApiToken ? '#16a34a' : '#dc2626' }}>
                  {smsApiToken ? 'check_circle' : 'cancel'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: smsApiToken ? '#15803d' : '#dc2626' }}>
                  {smsApiToken ? 'مزود SMS مُعيّن — جاهز للإرسال' : 'لم يتم تعيين مزود SMS — أدخل البيانات أعلاه'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Sub Components =====
const IconCircle: React.FC<{ emoji: React.ReactNode; bg: string; size?: number; border?: string }> = ({ emoji, bg, size = 64, border }) => (
  <div style={{
    width: `${size}px`, height: `${size}px`, background: bg, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', fontSize: `${size * 0.44}px`,
    border: border ? `2px solid ${border}` : undefined,
  }}>{emoji}</div>
);

const StatCard: React.FC<{ label: string; value: number; color: string; bg: string }> = ({ label, value, color, bg }) => (
  <div style={{ background: bg, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
  </div>
);

// ===== Stage Teachers Section =====
const StageTeachersSection: React.FC<{ currentStage: string; status: StatusResult | null }> = ({ currentStage, status }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    whatsappApi.getStageTeachers()
      .then(res => {
        if (!cancelled) setTeachers(res.data?.data || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentStage]);

  const handleSendLink = async (teacher: any) => {
    if (!teacher.mobile || !teacher.tokenLink) {
      toast.error('لا يوجد رقم جوال أو رابط لهذا المعلم');
      return;
    }
    setSending(teacher.id);
    try {
      const msg = `مرحباً ${teacher.name}\nرابط نظام المتابعة السلوكية:\n${teacher.tokenLink}`;
      await whatsappApi.sendWithLog({
        studentId: 0,
        phone: teacher.mobile,
        message: msg,
        messageType: 'رابط_معلم',
        messageTitle: 'إرسال رابط المعلم',
        stage: currentStage,
      });
      toast.success(`تم إرسال الرابط إلى ${teacher.name}`);
    } catch {
      toast.error('فشل إرسال الرابط');
    } finally {
      setSending(null);
    }
  };

  if (loading) return (
    <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', padding: '24px', textAlign: 'center' }}>
      <LoadingSpinner text="جاري تحميل المعلمين..." />
    </div>
  );

  if (teachers.length === 0) return null;

  const stageInfo = getStageInfo(currentStage, '');
  const linked = teachers.filter(t => t.hasLink).length;

  return (
    <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <MI n="school" s={16} /> معلمين {stageInfo.label}
        </h3>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {linked}/{teachers.length} مربوطين
        </span>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {teachers.map((t: any) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
            background: t.hasLink ? '#f0fdf4' : '#fefce8', borderRadius: '12px',
            border: t.hasLink ? '1px solid #bbf7d0' : '1px solid #fde68a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: t.hasLink ? '#dcfce7' : '#fef9c3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MI n={t.hasLink ? 'check_circle' : 'link_off'} s={18} c={t.hasLink ? '#16a34a' : '#ca8a04'} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: '14px' }}>{t.name}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>
                  {t.subjects || '-'} {t.mobile ? `• ${t.mobile}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t.hasLink ? (
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, padding: '4px 10px', background: '#dcfce7', borderRadius: '100px' }}>
                  مربوط
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 600, padding: '4px 10px', background: '#fef9c3', borderRadius: '100px' }}>
                  غير مربوط
                </span>
              )}
              {t.hasLink && t.mobile && status?.connected && (
                <button
                  onClick={() => handleSendLink(t)}
                  disabled={sending === t.id}
                  style={{
                    ...btnStyle('#25d366', '#fff'),
                    padding: '6px 12px', fontSize: '12px',
                    opacity: sending === t.id ? 0.6 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginLeft: '4px' }}>send</span>
                  إرسال الرابط
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== Styles =====
const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  padding: '10px 20px', background: bg, color, border: 'none',
  borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
});
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 600 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '10px',
  fontSize: '14px', boxSizing: 'border-box' as const,
};

export default WhatsAppPage;
