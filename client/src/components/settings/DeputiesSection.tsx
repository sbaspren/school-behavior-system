import React, { useState, useEffect, useCallback } from 'react';
import { usersApi, UserData } from '../../api/users';
import { settingsApi, StageConfigData } from '../../api/settings';
import { whatsappApi } from '../../api/whatsapp';
import { showSuccess, showError } from '../shared/Toast';
import { SETTINGS_STAGES } from '../../utils/constants';
import LoadingSpinner from '../shared/LoadingSpinner';

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
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);


  // Deputy modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeputy, setEditingDeputy] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const getStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, structRes, settingsRes] = await Promise.all([
        usersApi.getAll(),
        settingsApi.getStructure(),
        settingsApi.getSettings(),
      ]);

      if (usersRes.data?.data) {
        const all = usersRes.data.data;
        setDeputies(all.filter((u: any) => u.permissions === 'وكيل شؤون الطلاب'));
        const stored = getStoredUser();
        if (stored) {
          const adm = all.find((u: any) => u.id === stored.id);
          if (adm) {
            setAdminUser(adm);
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

  // (WhatsApp QR linking moved to WhatsApp page)

  // --- Computed ---
  const isUnified = whatsAppMode === 'Unified';

  const takenBy = (excludeId?: number): string[] => {
    const t: string[] = [];
    deputies.forEach(d => {
      if (d.id !== excludeId) resolveStages(d.scopeValue).forEach(s => { if (!t.includes(s)) t.push(s); });
    });
    return t;
  };


  if (loading) {
    return <LoadingSpinner />;
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
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 15 }}>{adminUser.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontWeight: 700, border: '1px solid #fde68a' }}>
                  الأدمن
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>phone_android</span>
                {adminUser.mobile}
              </span>
            </div>
          </div>
        </div>
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

    </div>
  );
};


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
          <button onClick={onClose} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span></button>
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
                      {selected && <span className="material-symbols-outlined" style={{ fontSize: 14, marginLeft: 4 }}>check</span>}
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

          {/* ربط واتساب يتم من صفحة أدوات واتساب */}
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
              ربط واتساب الوكيل يتم من صفحة "أدوات واتساب" عند دخوله بحسابه
            </p>
          </div>
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
