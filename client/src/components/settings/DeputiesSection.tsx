import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usersApi, UserData } from '../../api/users';
import { settingsApi, StageConfigData } from '../../api/settings';
import { whatsappApi } from '../../api/whatsapp';
import { showSuccess, showError } from '../shared/Toast';
import { SETTINGS_STAGES } from '../../utils/constants';

/* ─── Helpers ────────────────────────────────── */
const stageName = (id: string) => SETTINGS_STAGES.find(s => s.id === id)?.name || id;

const resolveStages = (scopeValue: string): string[] => {
  if (!scopeValue) return [];
  const raw = scopeValue.split(',').filter(Boolean);
  const result: string[] = [];
  for (const v of raw) {
    if (SETTINGS_STAGES.some(s => s.id === v)) {
      if (!result.includes(v)) result.push(v);
    } else {
      const parts = v.split('_');
      if (parts.length >= 2) {
        const mid = parts[1];
        if (SETTINGS_STAGES.some(s => s.id === mid) && !result.includes(mid)) result.push(mid);
      }
    }
  }
  return result;
};

/* ─── Main Component ─────────────────────────── */
const DeputiesSection: React.FC = () => {
  const [deputies, setDeputies] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [enabledStages, setEnabledStages] = useState<string[]>([]);
  const [whatsAppMode, setWhatsAppMode] = useState('PerStage');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);

  // Admin editing
  const [adminStages, setAdminStages] = useState<string[]>([]);
  const [adminWhatsApp, setAdminWhatsApp] = useState('');
  const [adminEditing, setAdminEditing] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Deputy modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeputy, setEditingDeputy] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  // QR
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrConnected, setQrConnected] = useState<string | null>(null);
  const qrPollRef = useRef<any>(null);
  const qrRefreshRef = useRef<any>(null);
  const qrTimeoutRef = useRef<any>(null);

  const getStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, structRes, settingsRes, sessionsRes] = await Promise.all([
        usersApi.getAll(),
        settingsApi.getStructure(),
        settingsApi.getSettings(),
        whatsappApi.getSessions().catch(() => ({ data: { data: [] } })),
      ]);

      if (usersRes.data?.data) {
        const all = usersRes.data.data;
        setDeputies(all.filter((u: any) => u.permissions === 'وكيل شؤون الطلاب'));
        const stored = getStoredUser();
        if (stored) {
          const adm = all.find((u: any) => u.id === stored.id);
          if (adm) {
            setAdminUser(adm);
            setAdminWhatsApp(adm.whatsAppPhone || '');
            setAdminStages(resolveStages(adm.scopeValue || ''));
          }
        }
      }

      if (structRes.data?.data?.stages) {
        setEnabledStages(
          structRes.data.data.stages.filter((s: StageConfigData) => s.isEnabled).map((s: StageConfigData) => s.stage)
        );
      }

      if (settingsRes.data?.data?.whatsAppMode) {
        setWhatsAppMode(settingsRes.data.data.whatsAppMode);
      }

      if (sessionsRes.data?.data) {
        setSessions(sessionsRes.data.data);
      }
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- WhatsApp mode ---
  const handleModeChange = async (mode: string) => {
    setSavingMode(true);
    setWhatsAppMode(mode);
    try {
      await whatsappApi.saveSettings({ whatsAppMode: mode });
      showSuccess(mode === 'Unified' ? 'رقم واحد للمدرسة' : 'أرقام متعددة حسب المراحل');
    } catch {
      showError('خطأ في الحفظ');
    } finally {
      setSavingMode(false);
    }
  };

  // --- Admin save ---
  const handleSaveAdmin = async () => {
    if (!adminUser) return;
    setSavingAdmin(true);
    try {
      const data: UserData = {
        name: adminUser.name,
        hasWhatsApp: !!adminWhatsApp.trim(),
        whatsAppPhone: adminWhatsApp.trim() || undefined,
      };
      if (whatsAppMode === 'PerStage' && adminStages.length > 0) {
        data.scopeValue = adminStages.join(',');
      }
      const res = await usersApi.update(adminUser.id, data);
      if (res.data?.success) {
        showSuccess('تم الحفظ');
        setAdminEditing(false);
        loadData();
      } else {
        showError(res.data?.message || 'خطأ');
      }
    } catch {
      showError('خطأ في الاتصال');
    } finally {
      setSavingAdmin(false);
    }
  };

  // --- Delete deputy ---
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await usersApi.delete(confirmDelete.id);
      if (res.data?.success) {
        showSuccess('تم حذف الوكيل');
        setConfirmDelete(null);
        loadData();
      } else {
        showError(res.data?.message || 'خطأ');
      }
    } catch {
      showError('خطأ في الاتصال');
    }
  };

  // --- QR flow ---
  const stopQrPolling = useCallback(() => {
    [qrPollRef, qrRefreshRef, qrTimeoutRef].forEach(ref => {
      if (ref.current) { clearInterval(ref.current); clearTimeout(ref.current); ref.current = null; }
    });
  }, []);

  const startQr = async () => {
    setQrOpen(true);
    setQrData(null);
    setQrConnected(null);
    setQrLoading(true);
    stopQrPolling();
    try {
      const res = await whatsappApi.getQR();
      if (res.data?.data?.hasQR) {
        setQrData(res.data.data.qrData);
      } else {
        showError('لم يتم العثور على QR — تأكد من تشغيل سيرفر الواتساب');
        setQrOpen(false);
        return;
      }
    } catch {
      showError('خطأ في جلب QR');
      setQrOpen(false);
      return;
    } finally {
      setQrLoading(false);
    }

    let knownPhones: string[] = [];
    try {
      const sRes = await whatsappApi.getConnectedSessions();
      knownPhones = (sRes.data?.data || []).map((s: any) => s.phoneNumber || s.phone);
    } catch {}

    qrPollRef.current = setInterval(async () => {
      try {
        const sRes = await whatsappApi.getConnectedSessions();
        const phones = (sRes.data?.data || []).map((s: any) => s.phoneNumber || s.phone);
        const newPhone = phones.find((p: string) => !knownPhones.includes(p));
        if (newPhone) {
          stopQrPolling();
          setQrConnected(newPhone);
          const stage = whatsAppMode === 'Unified' ? '' : (adminStages.length === 1 ? adminStages[0] : '');
          await whatsappApi.syncAndSave({ phoneNumber: newPhone, stage, userType: 'مدير' });
          showSuccess('تم ربط الواتساب بنجاح');
          loadData();
        }
      } catch {}
    }, 5000);

    qrRefreshRef.current = setInterval(async () => {
      try {
        const res = await whatsappApi.getQR();
        if (res.data?.data?.hasQR) setQrData(res.data.data.qrData);
      } catch {}
    }, 15000);

    qrTimeoutRef.current = setTimeout(() => {
      stopQrPolling();
      setQrData(null);
      showError('انتهت المهلة — حاول مرة أخرى');
    }, 180000);
  };

  const closeQr = () => { stopQrPolling(); setQrOpen(false); setQrData(null); setQrConnected(null); };

  useEffect(() => () => stopQrPolling(), [stopQrPolling]);

  // --- Computed ---
  const isUnified = whatsAppMode === 'Unified';

  const allAssigned = [...adminStages];
  deputies.forEach(d => resolveStages(d.scopeValue).forEach(s => { if (!allAssigned.includes(s)) allAssigned.push(s); }));
  const uncovered = enabledStages.filter(s => !allAssigned.includes(s));

  const takenBy = (excludeId?: number): string[] => {
    const t = [...adminStages];
    deputies.forEach(d => {
      if (d.id !== excludeId) resolveStages(d.scopeValue).forEach(s => { if (!t.includes(s)) t.push(s); });
    });
    return t;
  };

  const getPhoneStatus = (phone: string): 'connected' | 'disconnected' | 'none' => {
    if (!phone) return 'none';
    const c = phone.replace(/^0/, '966');
    const s = sessions.find(ss => ss.phoneNumber === c || ss.phoneNumber === phone);
    return s ? (s.connectionStatus === 'متصل' ? 'connected' : 'disconnected') : 'none';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ background: 'linear-gradient(to left, #eff6ff, #eef2ff)', borderRadius: 16, padding: 20, border: '1px solid #bfdbfe', marginTop: 24 }}>

      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: 22 }}>shield_person</span>
          <h4 style={{ margin: 0, fontWeight: 700, color: '#1f2937', fontSize: 16 }}>وكلاء شؤون الطلاب</h4>
          <span style={{ padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', fontSize: 12, borderRadius: 9999, fontWeight: 700 }}>
            يدخلون واجهة الديسكتوب
          </span>
        </div>
        <button
          onClick={() => { setEditingDeputy(null); setModalOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: '#2563eb', color: '#fff', borderRadius: 10, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontSize: 13,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
          إضافة وكيل
        </button>
      </div>

      {/* ═══ WhatsApp Mode ═══ */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: 20 }}>chat</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>نمط واتساب أولياء الأمور</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { value: 'Unified', label: 'رقم واحد للمدرسة', desc: 'رقم واتساب المدير لجميع أولياء الأمور', icon: 'phone_android' },
            { value: 'PerStage', label: 'أرقام متعددة', desc: 'لكل مرحلة رقم واتساب مخصص', icon: 'smartphone' },
          ].map(opt => (
            <label key={opt.value} style={{
              flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: 12, borderRadius: 10, cursor: savingMode ? 'wait' : 'pointer',
              border: `2px solid ${whatsAppMode === opt.value ? '#2563eb' : '#e5e7eb'}`,
              background: whatsAppMode === opt.value ? '#eff6ff' : '#fff',
              opacity: savingMode ? 0.7 : 1,
            }}>
              <input type="radio" checked={whatsAppMode === opt.value} onChange={() => handleModeChange(opt.value)} disabled={savingMode} style={{ marginTop: 3 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: whatsAppMode === opt.value ? '#2563eb' : '#9ca3af' }}>{opt.icon}</span>
                  <span style={{ fontWeight: 700, color: whatsAppMode === opt.value ? '#1e40af' : '#374151', fontSize: 13 }}>{opt.label}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ═══ Admin Card (Fixed) ═══ */}
      {adminUser && (
        <AdminCard
          admin={adminUser}
          isUnified={isUnified}
          adminStages={adminStages}
          setAdminStages={setAdminStages}
          adminWhatsApp={adminWhatsApp}
          setAdminWhatsApp={setAdminWhatsApp}
          adminEditing={adminEditing}
          setAdminEditing={setAdminEditing}
          savingAdmin={savingAdmin}
          enabledStages={enabledStages}
          deputies={deputies}
          getPhoneStatus={getPhoneStatus}
          onSave={handleSaveAdmin}
          onStartQr={startQr}
        />
      )}

      {/* ═══ Deputies List ═══ */}
      {deputies.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 24, background: '#fff', borderRadius: 12,
          border: '1px dashed #93c5fd', color: '#6b7280', marginBottom: 12,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#93c5fd', display: 'block', marginBottom: 8 }}>person_add</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>لا يوجد وكلاء — أضف وكيل شؤون طلاب</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deputies.map(d => {
          const dStages = resolveStages(d.scopeValue);
          const wStatus = !isUnified && d.whatsAppPhone ? getPhoneStatus(d.whatsAppPhone) : null;
          return (
            <div key={d.id} style={{
              background: '#fff', borderRadius: 12, padding: '14px 18px',
              border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', background: '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: 22 }}>person</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 15 }}>{d.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>phone_android</span>
                    {d.mobile}
                  </span>
                  {dStages.map(sid => (
                    <span key={sid} style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#15803d', borderRadius: 9999, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                      {stageName(sid)}
                    </span>
                  ))}
                  {dStages.length === 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontWeight: 600 }}>
                      جميع المراحل
                    </span>
                  )}
                </div>
              </div>

              {/* WhatsApp status */}
              {!isUnified && d.whatsAppPhone && (
                <StatusBadge status={wStatus === 'connected' ? 'connected' : 'disconnected'} />
              )}
              {!isUnified && !d.whatsAppPhone && (
                <span style={{ padding: '4px 10px', fontSize: 12, borderRadius: 9999, fontWeight: 700, background: '#f3f4f6', color: '#9ca3af', flexShrink: 0 }}>
                  بدون واتساب
                </span>
              )}

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => { setEditingDeputy(d); setModalOpen(true); }} style={{
                  padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4f46e5' }}>edit</span>
                </button>
                <button onClick={() => setConfirmDelete(d)} style={{
                  padding: 6, background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Uncovered Stages Warning ═══ */}
      {uncovered.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginTop: 12,
        }}>
          <span className="material-symbols-outlined" style={{ color: '#b45309', fontSize: 20 }}>warning</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>مراحل غير مغطاة: </span>
            {uncovered.map(sid => (
              <span key={sid} style={{ fontSize: 12, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontWeight: 600, marginLeft: 4 }}>
                {stageName(sid)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Deputy Modal ═══ */}
      {modalOpen && (
        <DeputyModal
          deputy={editingDeputy}
          enabledStages={enabledStages}
          takenStages={takenBy(editingDeputy?.id)}
          isUnified={isUnified}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData(); }}
        />
      )}

      {/* ═══ Delete Confirm ═══ */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dc2626', marginBottom: 12 }}>warning</span>
            <h3 style={{ margin: '0 0 8px', color: '#1f2937' }}>تأكيد الحذف</h3>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>هل تريد حذف الوكيل "{confirmDelete.name}"؟</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 24px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleDelete} style={{ padding: '10px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ QR Modal ═══ */}
      {qrOpen && (
        <QRModal
          qrLoading={qrLoading}
          qrData={qrData}
          qrConnected={qrConnected}
          onClose={closeQr}
          onRetry={startQr}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Status Badge
   ═══════════════════════════════════════════════ */
const StatusBadge: React.FC<{ status: 'connected' | 'disconnected' }> = ({ status }) => {
  const connected = status === 'connected';
  return (
    <span style={{
      padding: '4px 10px', fontSize: 12, borderRadius: 9999, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      background: connected ? '#dcfce7' : '#fef2f2',
      color: connected ? '#16a34a' : '#dc2626',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#16a34a' : '#dc2626' }} />
      {connected ? 'متصل' : 'غير متصل'}
    </span>
  );
};

/* ═══════════════════════════════════════════════
   Admin Card
   ═══════════════════════════════════════════════ */
interface AdminCardProps {
  admin: any;
  isUnified: boolean;
  adminStages: string[];
  setAdminStages: React.Dispatch<React.SetStateAction<string[]>>;
  adminWhatsApp: string;
  setAdminWhatsApp: React.Dispatch<React.SetStateAction<string>>;
  adminEditing: boolean;
  setAdminEditing: React.Dispatch<React.SetStateAction<boolean>>;
  savingAdmin: boolean;
  enabledStages: string[];
  deputies: any[];
  getPhoneStatus: (phone: string) => 'connected' | 'disconnected' | 'none';
  onSave: () => void;
  onStartQr: () => void;
}

const AdminCard: React.FC<AdminCardProps> = ({
  admin, isUnified, adminStages, setAdminStages, adminWhatsApp, setAdminWhatsApp,
  adminEditing, setAdminEditing, savingAdmin, enabledStages, deputies,
  getPhoneStatus, onSave, onStartQr,
}) => {
  const phoneStatus = admin.whatsAppPhone ? getPhoneStatus(admin.whatsAppPhone) : 'none';

  return (
    <div style={{
      background: '#fffbeb', borderRadius: 12, padding: '14px 18px',
      border: '2px solid #fde68a', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ color: '#b45309', fontSize: 22 }}>admin_panel_settings</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 15 }}>{admin.name}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontWeight: 700, border: '1px solid #fde68a' }}>
              المدير
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>phone_android</span>
              {admin.mobile}
            </span>
            {isUnified ? (
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#15803d', borderRadius: 9999, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                جميع المراحل
              </span>
            ) : (
              adminStages.map(sid => (
                <span key={sid} style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#15803d', borderRadius: 9999, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                  {stageName(sid)}
                </span>
              ))
            )}
          </div>
        </div>

        {/* WhatsApp Status */}
        {phoneStatus !== 'none' && (
          <StatusBadge status={phoneStatus === 'connected' ? 'connected' : 'disconnected'} />
        )}

        <button onClick={() => setAdminEditing(!adminEditing)} style={{
          padding: 6, background: adminEditing ? '#dbeafe' : '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4f46e5' }}>
            {adminEditing ? 'close' : 'edit'}
          </span>
        </button>
      </div>

      {/* Expandable edit area */}
      {adminEditing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #fde68a' }}>
          {/* Stage selection (PerStage only) */}
          {!isUnified && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                المراحل المسؤول عنها
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {enabledStages.map(sid => {
                  const selected = adminStages.includes(sid);
                  const takenByDeputy = deputies.some(d => resolveStages(d.scopeValue).includes(sid));
                  return (
                    <button key={sid}
                      disabled={takenByDeputy && !selected}
                      onClick={() => setAdminStages(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid])}
                      style={{
                        padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                        border: selected ? '2px solid #b45309' : '2px solid #d1d5db',
                        background: selected ? '#fef3c7' : (takenByDeputy ? '#f9fafb' : '#fff'),
                        color: selected ? '#92400e' : (takenByDeputy ? '#d1d5db' : '#6b7280'),
                        cursor: takenByDeputy && !selected ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {selected && <span style={{ marginLeft: 4 }}>✓</span>}
                      {stageName(sid)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* WhatsApp phone */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              رقم واتساب أولياء الأمور
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="tel" value={adminWhatsApp} onChange={e => setAdminWhatsApp(e.target.value)}
                placeholder="05XXXXXXXX"
                style={{ flex: 1, height: 40, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
              />
              <button onClick={onStartQr} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
                background: '#16a34a', color: '#fff', borderRadius: 10, fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_2</span>
                ربط الآن
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onSave} disabled={savingAdmin} style={{
              padding: '8px 20px', background: '#b45309', color: '#fff', borderRadius: 10,
              fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 13,
              opacity: savingAdmin ? 0.7 : 1,
            }}>
              {savingAdmin ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   QR Modal
   ═══════════════════════════════════════════════ */
interface QRModalProps {
  qrLoading: boolean;
  qrData: string | null;
  qrConnected: string | null;
  onClose: () => void;
  onRetry: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ qrLoading, qrData, qrConnected, onClose, onRetry }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>ربط واتساب</h3>
        <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
      </div>

      {qrLoading && (
        <div style={{ padding: 40 }}>
          <div className="spinner" />
          <p style={{ color: '#6b7280', marginTop: 12 }}>جاري جلب رمز QR...</p>
        </div>
      )}

      {qrConnected && (
        <div style={{ padding: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#16a34a' }}>check_circle</span>
          <p style={{ fontWeight: 700, color: '#15803d', fontSize: 16, margin: '12px 0 4px' }}>تم الربط بنجاح!</p>
          <p style={{ color: '#6b7280', fontSize: 13 }}>{qrConnected}</p>
          <button onClick={onClose} style={{ marginTop: 16, padding: '10px 32px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            تم
          </button>
        </div>
      )}

      {!qrLoading && !qrConnected && qrData && (
        <div>
          <img src={qrData} alt="QR Code" style={{ width: 240, height: 240, objectFit: 'contain' }} />
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>
            افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>في انتظار المسح...</span>
          </div>
        </div>
      )}

      {!qrLoading && !qrConnected && !qrData && (
        <div style={{ padding: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dc2626' }}>error</span>
          <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 8 }}>تعذر جلب رمز QR</p>
          <button onClick={onRetry} style={{ marginTop: 12, padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   Deputy Add/Edit Modal
   ═══════════════════════════════════════════════ */
interface DeputyModalProps {
  deputy: any;
  enabledStages: string[];
  takenStages: string[];
  isUnified: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const DeputyModal: React.FC<DeputyModalProps> = ({ deputy, enabledStages, takenStages, isUnified, onClose, onSaved }) => {
  const isEdit = !!deputy;
  const [name, setName] = useState(deputy?.name || '');
  const [mobile, setMobile] = useState(deputy?.mobile || '');
  const [password, setPassword] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>(() =>
    deputy?.scopeValue ? resolveStages(deputy.scopeValue) : []
  );
  const [whatsAppPhone, setWhatsAppPhone] = useState(deputy?.whatsAppPhone || '');
  const [saving, setSaving] = useState(false);

  const toggleStage = (sid: string) => {
    setSelectedStages(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);
  };

  const handleSave = async () => {
    if (!name.trim() || !mobile.trim()) { showError('الاسم ورقم الجوال مطلوبان'); return; }
    if (!/^05\d{8}$/.test(mobile.trim())) { showError('رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام'); return; }
    if (!isEdit && !password.trim()) { showError('كلمة المرور مطلوبة'); return; }

    setSaving(true);
    const data: UserData = {
      name: name.trim(),
      role: 'Deputy',
      mobile: mobile.trim(),
      password: password.trim() || undefined,
      permissions: 'وكيل شؤون الطلاب',
      scopeType: selectedStages.length > 0 ? 'stages' : 'all',
      scopeValue: selectedStages.join(','),
      hasWhatsApp: !isUnified && !!whatsAppPhone.trim(),
      whatsAppPhone: !isUnified ? (whatsAppPhone.trim() || '') : '',
    };

    try {
      const res = isEdit ? await usersApi.update(deputy!.id, data) : await usersApi.add(data);
      if (res.data?.success) {
        showSuccess(isEdit ? 'تم تحديث الوكيل' : 'تم إضافة الوكيل');
        onSaved();
      } else {
        showError(res.data?.message || 'خطأ');
      }
    } catch {
      showError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', background: 'linear-gradient(to left, #eff6ff, #dbeafe)',
          borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e40af' }}>
            {isEdit ? 'تعديل وكيل' : 'إضافة وكيل شؤون طلاب'}
          </h3>
          <button onClick={onClose} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>الاسم *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الوكيل"
              style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box', fontSize: 14 }} />
          </div>

          {/* Mobile + Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>رقم الجوال *</label>
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="05XXXXXXXX"
                style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                كلمة المرور {isEdit ? '' : '*'}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? 'اتركه فارغ إذا لا تريد تغييره' : 'كلمة المرور'}
                style={{ width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box', fontSize: 14 }} />
            </div>
          </div>

          {/* Stages with overlap prevention */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              المراحل المسؤول عنها
            </label>
            {enabledStages.length === 0 ? (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
                لم يتم تفعيل أي مرحلة — فعّل المراحل من تبويب "هيكل الصفوف" أولاً
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {enabledStages.map(sid => {
                  const selected = selectedStages.includes(sid);
                  const taken = takenStages.includes(sid) && !selected;
                  return (
                    <button key={sid} disabled={taken}
                      onClick={() => toggleStage(sid)}
                      style={{
                        padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                        border: selected ? '2px solid #2563eb' : '2px solid #d1d5db',
                        background: selected ? '#dbeafe' : (taken ? '#f9fafb' : '#fff'),
                        color: selected ? '#1e40af' : (taken ? '#d1d5db' : '#6b7280'),
                        cursor: taken ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {selected && <span style={{ marginLeft: 4 }}>✓</span>}
                      {stageName(sid)}
                      {taken && (
                        <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 99, fontWeight: 600 }}>
                          مأخوذة
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedStages.length === 0 && enabledStages.length > 0 && (
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>
                إذا لم تحدد مرحلة سيكون للوكيل صلاحية على جميع المراحل
              </p>
            )}
          </div>

          {/* WhatsApp Phone (PerStage only) */}
          {!isUnified && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#16a34a', marginLeft: 4 }}>chat</span>
                رقم واتساب أولياء الأمور
              </label>
              <input type="tel" value={whatsAppPhone} onChange={e => setWhatsAppPhone(e.target.value)}
                placeholder={mobile || '05XXXXXXXX — سيربط الوكيل الرقم من واجهته'}
                style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', fontSize: 13 }} />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>
                يقوم الوكيل بربط هذا الرقم عبر QR من واجهته الخاصة
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            إلغاء
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الوكيل')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeputiesSection;
