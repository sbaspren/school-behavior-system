import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../api/admin';

// ═══════════════════════════════════════════════════
// ★ لوحة تحكم المشرف — إدارة اشتراكات المدارس
// ═══════════════════════════════════════════════════

interface Tenant {
  id: number;
  code: string;
  schoolName: string;
  adminName: string;
  adminPhone: string;
  plan: string;
  status: string;
  durationDays: number;
  amount: number;
  isPaid: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  daysRemaining: number;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  trial: number;
  unused: number;
  revoked: number;
  expiringSoon: number;
}

type ModalType = 'none' | 'create' | 'extend' | 'details' | 'payment' | 'delete';

const PLAN_LABELS: Record<string, string> = {
  Trial: 'تجريبي (14 يوم)',
  Semester: 'فصلي (6 أشهر)',
  Yearly: 'سنوي (12 شهر)',
  TwoYears: 'سنتان (24 شهر)',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Unused:  { label: 'غير مفعّل', color: '#6b7280', bg: '#f3f4f6' },
  Active:  { label: 'فعّال',     color: '#059669', bg: '#ecfdf5' },
  Expired: { label: 'منتهي',     color: '#dc2626', bg: '#fef2f2' },
  Revoked: { label: 'ملغي',      color: '#9333ea', bg: '#faf5ff' },
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ═══ شاشة تسجيل الدخول ═══
function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return setError('أدخل المفتاح الرئيسي');
    setLoading(true);
    setError('');
    try {
      await adminService.auth(key.trim());
      sessionStorage.setItem('masterKey', key.trim());
      onAuth();
    } catch {
      setError('المفتاح غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      direction: 'rtl', fontFamily: "'Cairo', sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff', borderRadius: '16px', padding: '48px 40px', width: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,.25)', textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 4px 14px rgba(79,70,229,.4)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#fff' }}>admin_panel_settings</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>لوحة التحكم</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 32px' }}>إدارة اشتراكات المدارس</p>

        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="المفتاح الرئيسي (Master Key)"
          style={{
            width: '100%', padding: '14px 16px', fontSize: '15px', borderRadius: '10px',
            border: '2px solid #e2e8f0', outline: 'none', textAlign: 'center',
            fontFamily: 'monospace', letterSpacing: '2px', boxSizing: 'border-box',
            transition: 'border-color .2s',
          }}
          onFocus={e => e.target.style.borderColor = '#4f46e5'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          autoFocus
        />

        {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '12px 0 0', fontWeight: 600 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700,
          background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer',
          marginTop: '20px', transition: 'all .2s',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {loading ? 'جاري التحقق...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}

// ═══ بطاقة إحصائية ═══
function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #f1f5f9',
      flex: '1', minWidth: '180px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '24px', color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  );
}

// ═══ المودال — إنشاء اشتراك ═══
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [plan, setPlan] = useState('Yearly');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ code: string; plan: string; durationDays: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminService.generate({
        plan,
        phone: phone || undefined,
        amount: amount ? parseFloat(amount) : 0,
        notes: notes || undefined,
      });
      setResult(res.data.data);
      onCreated();
    } catch {
      alert('حدث خطأ أثناء إنشاء الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>إنشاء اشتراك جديد</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {result ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#059669' }}>check_circle</span>
            </div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>تم إنشاء كود التفعيل</p>
            <div style={{
              background: '#f8fafc', borderRadius: '10px', padding: '16px', margin: '16px 0',
              border: '2px dashed #cbd5e1',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5', letterSpacing: '3px', fontFamily: 'monospace' }}>
                {result.code}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {PLAN_LABELS[result.plan] || result.plan} — {result.durationDays} يوم
              </div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(result.code); }} style={{
              ...primaryBtnStyle, background: '#059669', width: 'auto', padding: '10px 32px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
              نسخ الكود
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>نوع الاشتراك</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
                <option value="Trial">تجريبي (14 يوم)</option>
                <option value="Yearly">سنوي (365 يوم)</option>
                <option value="TwoYears">سنتان (730 يوم)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>رقم الجوال (اختياري)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>المبلغ (ريال)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>ملاحظات</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء كود التفعيل'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ═══ المودال — تمديد اشتراك ═══
function ExtendModal({ tenant, onClose, onDone }: { tenant: Tenant; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState('365');
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    setLoading(true);
    try {
      const isRevoked = tenant.status === 'Revoked';
      if (isRevoked) {
        await adminService.reactivate(tenant.code, parseInt(days));
      } else {
        await adminService.extend(tenant.code, parseInt(days));
      }
      onDone();
      onClose();
    } catch {
      alert('حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
            {tenant.status === 'Revoked' ? 'إعادة تفعيل' : 'تمديد اشتراك'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#475569' }}>
            <strong>{tenant.schoolName || tenant.code}</strong>
            <br />الحالة: {STATUS_LABELS[tenant.status]?.label || tenant.status}
            {tenant.expiresAt && <><br />ينتهي: {formatDate(tenant.expiresAt)}</>}
          </div>
          <div>
            <label style={labelStyle}>عدد الأيام</label>
            <select value={days} onChange={e => setDays(e.target.value)} style={inputStyle}>
              <option value="14">14 يوم (تجريبي)</option>
              <option value="30">30 يوم</option>
              <option value="90">90 يوم (3 أشهر)</option>
              <option value="180">180 يوم (6 أشهر)</option>
              <option value="365">365 يوم (سنة)</option>
              <option value="730">730 يوم (سنتان)</option>
            </select>
          </div>
          <button onClick={handleExtend} disabled={loading} style={primaryBtnStyle}>
            {loading ? 'جاري التنفيذ...' : tenant.status === 'Revoked' ? 'إعادة التفعيل' : 'تمديد الاشتراك'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ مودال الدفع ═══
function PaymentModal({ tenant, onClose, onDone }: { tenant: Tenant; onClose: () => void; onDone: () => void }) {
  const [isPaid, setIsPaid] = useState(tenant.isPaid);
  const [amount, setAmount] = useState(String(tenant.amount || ''));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminService.updatePayment(tenant.code, isPaid, isPaid ? parseFloat(amount || '0') : 0);
      onDone();
      onClose();
    } catch {
      alert('حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>بيانات الدفع</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#475569' }}>
            <strong>{tenant.schoolName || tenant.code}</strong>
            <br />الخطة: {PLAN_LABELS[tenant.plan] || tenant.plan}
          </div>
          <div>
            <label style={labelStyle}>هل تم الدفع؟</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsPaid(true)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                border: '2px solid', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                background: isPaid ? '#ecfdf5' : '#fff',
                borderColor: isPaid ? '#059669' : '#e2e8f0',
                color: isPaid ? '#059669' : '#94a3b8',
              }}>نعم، تم الدفع</button>
              <button onClick={() => setIsPaid(false)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                border: '2px solid', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                background: !isPaid ? '#fef2f2' : '#fff',
                borderColor: !isPaid ? '#dc2626' : '#e2e8f0',
                color: !isPaid ? '#dc2626' : '#94a3b8',
              }}>لا، لم يدفع</button>
            </div>
          </div>
          {isPaid && (
            <div>
              <label style={labelStyle}>المبلغ المدفوع (ريال)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          )}
          <button onClick={handleSave} disabled={loading} style={primaryBtnStyle}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ مودال حذف المدرسة — تأكيد أنيق ═══
function DeleteModal({ tenant, onClose, onDone }: { tenant: Tenant; onClose: () => void; onDone: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const schoolLabel = tenant.schoolName || tenant.code;
  const canDelete = confirmText === 'حذف';

  const handleDelete = async () => {
    setLoading(true);
    try {
      await adminService.deleteSchool(tenant.code);
      onDone();
      onClose();
    } catch {
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        {step === 1 ? (
          <>
            {/* الخطوة 1 — تحذير أولي */}
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', border: '3px solid #fecaca',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#dc2626' }}>
                  warning
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>
                حذف المدرسة نهائياً
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.8 }}>
                أنت على وشك حذف <strong style={{ color: '#1e293b' }}>{schoolLabel}</strong> وجميع بياناتها بشكل نهائي.
                <br />هذا الإجراء <strong style={{ color: '#dc2626' }}>لا يمكن التراجع عنه</strong>.
              </p>

              <div style={{
                background: '#fef2f2', borderRadius: '12px', padding: '16px', marginBottom: '24px',
                border: '1px solid #fecaca', textAlign: 'right',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '10px' }}>
                  سيتم حذف كل ما يلي نهائياً:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#b91c1c' }}>
                  {[
                    'حسابات المستخدمين', 'بيانات الطلاب',
                    'المعلمين', 'المخالفات',
                    'الغياب والتأخر', 'الاستئذانات',
                    'الملاحظات التربوية', 'السلوك الإيجابي',
                    'سجلات التواصل', 'اللجان',
                    'إعدادات المدرسة', 'جميع البيانات الأخرى',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: '#f1f5f9', color: '#475569', border: '2px solid #e2e8f0',
                  borderRadius: '10px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                }}>إلغاء</button>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif", boxShadow: '0 2px 8px rgba(220,38,38,.3)',
                }}>متابعة الحذف</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* الخطوة 2 — تأكيد نهائي بكتابة كلمة "حذف" */}
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', boxShadow: '0 4px 20px rgba(220,38,38,.35)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#fff' }}>
                  delete_forever
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>
                تأكيد الحذف النهائي
              </h2>
              <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#64748b' }}>
                مدرسة: <strong style={{ color: '#1e293b' }}>{schoolLabel}</strong>
              </p>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>
                الكود: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{tenant.code}</span>
                {' '} • ID: <span style={{ fontWeight: 700 }}>{tenant.id}</span>
              </p>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#475569', lineHeight: 1.8 }}>
                اكتب <span style={{
                  display: 'inline-block', padding: '2px 12px', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 800,
                  color: '#dc2626', fontSize: '15px',
                }}>حذف</span> للتأكيد
              </p>

              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="اكتب: حذف"
                autoFocus
                style={{
                  width: '100%', padding: '14px', fontSize: '18px', fontWeight: 800,
                  textAlign: 'center', borderRadius: '12px', boxSizing: 'border-box',
                  border: `3px solid ${canDelete ? '#dc2626' : '#e2e8f0'}`,
                  outline: 'none', color: '#dc2626', fontFamily: "'Cairo', sans-serif",
                  transition: 'border-color .2s',
                  background: canDelete ? '#fef2f2' : '#fff',
                }}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => { setStep(1); setConfirmText(''); }} style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: '#f1f5f9', color: '#475569', border: '2px solid #e2e8f0',
                  borderRadius: '10px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                }}>رجوع</button>
                <button onClick={handleDelete} disabled={!canDelete || loading} style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: canDelete && !loading
                    ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                    : '#e5e7eb',
                  color: canDelete && !loading ? '#fff' : '#9ca3af',
                  border: 'none', borderRadius: '10px',
                  cursor: canDelete && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: "'Cairo', sans-serif",
                  boxShadow: canDelete ? '0 2px 8px rgba(220,38,38,.3)' : 'none',
                  transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  {loading ? (
                    'جاري الحذف...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                      حذف نهائياً
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══ تفاصيل المدرسة ═══
function DetailsPanel({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const s = STATUS_LABELS[tenant.status] || STATUS_LABELS.Unused;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>تفاصيل الاشتراك</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {detailRow('الكود', tenant.code)}
            {detailRow('الحالة', s.label, s.color)}
            {detailRow('المدرسة', tenant.schoolName || '—')}
            {detailRow('المدير', tenant.adminName || '—')}
            {detailRow('الجوال', tenant.adminPhone || '—')}
            {detailRow('الخطة', PLAN_LABELS[tenant.plan] || tenant.plan)}
            {detailRow('المبلغ', `${tenant.amount} ريال`)}
            {detailRow('المدة', `${tenant.durationDays} يوم`)}
            {detailRow('تاريخ الإنشاء', formatDate(tenant.createdAt))}
            {detailRow('تاريخ التفعيل', formatDate(tenant.activatedAt))}
            {detailRow('تاريخ الانتهاء', formatDate(tenant.expiresAt))}
            {detailRow('الأيام المتبقية', tenant.daysRemaining > 0 ? `${tenant.daysRemaining} يوم` : '—')}
          </div>
          {tenant.amount > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', fontSize: '13px', color: '#15803d' }}>
              مدفوع: {tenant.amount} ريال
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function detailRow(label: string, value: string, color?: string) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: color || '#1e293b' }}>{value}</div>
    </div>
  );
}

// ═══ الصفحة الرئيسية ═══
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('masterKey'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modal, setModal] = useState<ModalType>('none');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'schools' | 'calendar'>('schools');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        adminService.getStats(),
        adminService.listAll(),
      ]);
      setStats(statsRes.data.data);
      setTenants(tenantsRes.data.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        sessionStorage.removeItem('masterKey');
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  if (!authed) return <AdminLogin onAuth={() => setAuthed(true)} />;

  // Filter + Search
  const filtered = tenants.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.code.toLowerCase().includes(q) ||
        t.schoolName.toLowerCase().includes(q) ||
        t.adminName.toLowerCase().includes(q) ||
        t.adminPhone.includes(q)
      );
    }
    return true;
  });

  const handleImpersonate = async (tenant: Tenant) => {
    if (tenant.status === 'Unused') return alert('هذه المدرسة لم تُفعَّل بعد');
    try {
      const res = await adminService.impersonate(tenant.code);
      const { token, user } = res.data.data;
      // فتح نافذة جديدة مع بيانات تسجيل الدخول
      const loginData = JSON.stringify(user);
      const newWindow = window.open('/', '_blank');
      if (newWindow) {
        newWindow.addEventListener('load', () => {
          newWindow.localStorage.setItem('token', token);
          newWindow.localStorage.setItem('user', loginData);
          newWindow.localStorage.removeItem('subscription_expired');
          newWindow.location.reload();
        });
        // fallback — في حال لم يعمل load event
        setTimeout(() => {
          try {
            newWindow.localStorage.setItem('token', token);
            newWindow.localStorage.setItem('user', loginData);
            newWindow.localStorage.removeItem('subscription_expired');
            newWindow.location.href = '/';
          } catch { /* cross-origin fallback */ }
        }, 500);
      }
    } catch {
      alert('حدث خطأ أثناء الدخول');
    }
  };

  const handleRevoke = async (tenant: Tenant) => {
    if (!confirm(`هل تريد إلغاء اشتراك ${tenant.schoolName || tenant.code}؟`)) return;
    try {
      await adminService.revoke(tenant.code);
      loadData();
    } catch {
      alert('حدث خطأ');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('masterKey');
    setAuthed(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f1f5f9', direction: 'rtl',
      fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff' }}>shield</span>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>لوحة تحكم الاشتراكات</span>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: 'rgba(255,255,255,.1)', color: '#e2e8f0',
          borderRadius: '8px', border: '1px solid rgba(255,255,255,.15)', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
          خروج
        </button>
      </header>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '4px' }}>
          {[
            { id: 'schools' as const, label: 'المدارس', icon: 'domain' },
            { id: 'calendar' as const, label: 'التقويم الدراسي', icon: 'calendar_month' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '14px 24px', fontSize: '14px', fontWeight: 700,
              background: activeTab === tab.id ? '#eef2ff' : 'transparent',
              color: activeTab === tab.id ? '#4f46e5' : '#64748b',
              border: 'none', borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
              cursor: 'pointer', fontFamily: "'Cairo', sans-serif", transition: 'all .15s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>

      {activeTab === 'calendar' && <CalendarTab />}

      {activeTab === 'schools' && <>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <StatCard icon="domain" label="إجمالي المدارس" value={stats.total} color="#4f46e5" bg="#eef2ff" />
            <StatCard icon="check_circle" label="فعّال" value={stats.active} color="#059669" bg="#ecfdf5" />
            <StatCard icon="cancel" label="منتهي" value={stats.expired} color="#dc2626" bg="#fef2f2" />
            <StatCard icon="science" label="تجريبي" value={stats.trial} color="#d97706" bg="#fffbeb" />
            <StatCard icon="inventory_2" label="غير مفعّل" value={stats.unused} color="#6b7280" bg="#f3f4f6" />
            {stats.expiringSoon > 0 && (
              <StatCard icon="warning" label="ينتهي قريباً" value={stats.expiringSoon} color="#ea580c" bg="#fff7ed" />
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #f1f5f9', marginBottom: '16px',
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '20px', color: '#94a3b8',
            }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالكود، اسم المدرسة، المدير، الجوال..."
              style={{
                width: '100%', padding: '10px 44px 10px 16px', fontSize: '14px',
                borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none',
                fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box',
              }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
            padding: '10px 16px', fontSize: '14px', borderRadius: '10px',
            border: '2px solid #e2e8f0', fontFamily: "'Cairo', sans-serif",
            fontWeight: 600, color: '#475569', cursor: 'pointer',
          }}>
            <option value="all">جميع الحالات</option>
            <option value="Active">فعّال</option>
            <option value="Expired">منتهي</option>
            <option value="Unused">غير مفعّل</option>
            <option value="Revoked">ملغي</option>
          </select>
          <button onClick={() => setModal('create')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 24px', fontSize: '14px', fontWeight: 700,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif", boxShadow: '0 2px 8px rgba(79,70,229,.3)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            اشتراك جديد
          </button>
          <button onClick={loadData} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '10px 16px', fontSize: '14px', fontWeight: 600,
            background: '#f8fafc', color: '#475569',
            border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            تحديث
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #f1f5f9',
        }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>inbox</span>
              لا توجد نتائج
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'ID', 'الكود', 'المدرسة', 'المدير', 'الخطة', 'الدفع', 'الحالة', 'ينتهي', 'متبقي', 'إجراءات'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', fontWeight: 700, color: '#64748b',
                        textAlign: 'right', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const s = STATUS_LABELS[t.status] || STATUS_LABELS.Unused;
                    return (
                      <tr key={t.id} style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background .15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfe')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td style={cellStyle}>{i + 1}</td>
                        <td style={cellStyle}>
                          <span title="TenantId في قاعدة البيانات" style={{
                            fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '13px',
                            background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', cursor: 'default',
                          }}>{t.id}</span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', fontSize: '12px' }}>{t.code}</span>
                        </td>
                        <td style={cellStyle}>
                          <button onClick={() => { setSelectedTenant(t); setModal('details'); }}
                            style={{ background: 'none', border: 'none', color: '#1e293b', fontWeight: 700, cursor: 'pointer', fontFamily: "'Cairo', sans-serif", fontSize: '13px' }}>
                            {t.schoolName || '—'}
                          </button>
                        </td>
                        <td style={cellStyle}>{t.adminName || '—'}</td>
                        <td style={cellStyle}>{PLAN_LABELS[t.plan] || t.plan}</td>
                        <td style={cellStyle}>
                          <button onClick={() => { setSelectedTenant(t); setModal('payment'); }}
                            style={{
                              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                              border: 'none', cursor: 'pointer',
                              background: t.isPaid ? '#ecfdf5' : '#fef2f2',
                              color: t.isPaid ? '#059669' : '#dc2626',
                            }}>
                            {t.isPaid ? `مدفوع ${t.amount > 0 ? t.amount + ' ر.س' : ''}` : 'غير مدفوع'}
                          </button>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                            background: s.bg, color: s.color,
                          }}>{s.label}</span>
                        </td>
                        <td style={cellStyle}>{formatDate(t.expiresAt)}</td>
                        <td style={cellStyle}>
                          {t.daysRemaining > 0 ? (
                            <span style={{
                              fontWeight: 700,
                              color: t.daysRemaining <= 7 ? '#dc2626' : t.daysRemaining <= 30 ? '#d97706' : '#059669',
                            }}>{t.daysRemaining} يوم</span>
                          ) : '—'}
                        </td>
                        <td style={{ ...cellStyle, display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setSelectedTenant(t); setModal('extend'); }}
                            title="تمديد" style={actionBtnStyle('#3b82f6', '#eff6ff')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>update</span>
                          </button>
                          {t.status !== 'Revoked' && t.status !== 'Unused' && (
                            <button onClick={() => handleRevoke(t)}
                              title="إلغاء" style={actionBtnStyle('#dc2626', '#fef2f2')}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
                            </button>
                          )}
                          {t.status !== 'Unused' && (
                            <button onClick={() => handleImpersonate(t)}
                              title="الدخول كمدير" style={actionBtnStyle('#059669', '#ecfdf5')}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
                            </button>
                          )}
                          <button onClick={() => { setSelectedTenant(t); setModal('details'); }}
                            title="تفاصيل" style={actionBtnStyle('#6b7280', '#f3f4f6')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                          </button>
                          <button onClick={() => { setSelectedTenant(t); setModal('delete'); }}
                            title="حذف نهائي" style={actionBtnStyle('#dc2626', '#fef2f2')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_forever</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #f1f5f9',
              fontSize: '13px', color: '#94a3b8', fontWeight: 600,
            }}>
              عرض {filtered.length} من {tenants.length} مدرسة
            </div>
          )}
        </div>

        {/* Modals */}
        {modal === 'create' && <CreateModal onClose={() => setModal('none')} onCreated={loadData} />}
        {modal === 'extend' && selectedTenant && (
          <ExtendModal tenant={selectedTenant} onClose={() => setModal('none')} onDone={loadData} />
        )}
        {modal === 'details' && selectedTenant && (
          <DetailsPanel tenant={selectedTenant} onClose={() => setModal('none')} />
        )}
        {modal === 'payment' && selectedTenant && (
          <PaymentModal tenant={selectedTenant} onClose={() => setModal('none')} onDone={loadData} />
        )}
        {modal === 'delete' && selectedTenant && (
          <DeleteModal tenant={selectedTenant} onClose={() => setModal('none')} onDone={loadData} />
        )}
      </>}

      </div>
    </div>
  );
}

// ═══ تبويب التقويم الدراسي ═══
interface CalendarEntry {
  id: number;
  academicYear: string;
  label: string;
  semester1Start: string;
  semester1End: string;
  semester2Start: string;
  semester2End: string;
  bufferDays: number;
  isCurrent: boolean;
}

function CalendarTab() {
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CalendarEntry> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getCalendars();
      setCalendars(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCalendars(); }, [loadCalendars]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.academicYear || !editing.semester1Start || !editing.semester1End || !editing.semester2Start || !editing.semester2End) {
      return alert('جميع الحقول مطلوبة');
    }
    setSaving(true);
    try {
      await adminService.saveCalendar({
        id: editing.id || 0,
        academicYear: editing.academicYear || '',
        label: editing.label || '',
        semester1Start: editing.semester1Start || '',
        semester1End: editing.semester1End || '',
        semester2Start: editing.semester2Start || '',
        semester2End: editing.semester2End || '',
        bufferDays: editing.bufferDays || 4,
      });
      setEditing(null);
      loadCalendars();
    } catch {
      alert('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذا التقويم؟')) return;
    try {
      await adminService.deleteCalendar(id);
      loadCalendars();
    } catch { alert('حدث خطأ'); }
  };

  const toDateInput = (d: string) => d ? d.substring(0, 10) : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>التقويم الدراسي</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>أدخل تواريخ الفصول لـ 5 سنوات مقدماً</p>
        </div>
        <button onClick={() => setEditing({ bufferDays: 4 })} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 24px', fontSize: '14px', fontWeight: 700,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer',
          fontFamily: "'Cairo', sans-serif",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          إضافة عام دراسي
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>جاري التحميل...</div>
      ) : calendars.length === 0 && !editing ? (
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '48px', textAlign: 'center',
          border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>calendar_month</span>
          <p style={{ color: '#94a3b8', fontWeight: 600 }}>لم يتم إدخال أي تقويم دراسي بعد</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {calendars.map(cal => (
            <div key={cal.id} style={{
              background: '#fff', borderRadius: '14px', padding: '20px 24px',
              border: cal.isCurrent ? '2px solid #4f46e5' : '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)', position: 'relative',
            }}>
              {cal.isCurrent && (
                <span style={{
                  position: 'absolute', top: '-10px', left: '20px',
                  background: '#4f46e5', color: '#fff', fontSize: '11px', fontWeight: 700,
                  padding: '2px 12px', borderRadius: '10px',
                }}>الحالي</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{cal.academicYear} هـ</span>
                  {cal.label && <span style={{ fontSize: '14px', color: '#64748b', marginRight: '12px' }}>({cal.label} م)</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditing(cal)} style={actionBtnStyle('#3b82f6', '#eff6ff')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(cal.id)} style={actionBtnStyle('#dc2626', '#fef2f2')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', marginBottom: '8px' }}>الفصل الأول</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    من: <strong>{new Date(cal.semester1Start).toLocaleDateString('ar-SA')}</strong>
                    <br />إلى: <strong>{new Date(cal.semester1End).toLocaleDateString('ar-SA')}</strong>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>الفصل الثاني</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    من: <strong>{new Date(cal.semester2Start).toLocaleDateString('ar-SA')}</strong>
                    <br />إلى: <strong>{new Date(cal.semester2End).toLocaleDateString('ar-SA')}</strong>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                أيام الاحتياط: {cal.bufferDays} أيام
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال إضافة/تعديل */}
      {editing && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={{ ...modalStyle, maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                {editing.id ? 'تعديل التقويم' : 'إضافة عام دراسي'}
              </h2>
              <button onClick={() => setEditing(null)} style={closeBtnStyle}>&times;</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>العام الهجري</label>
                  <input value={editing.academicYear || ''} onChange={e => setEditing({ ...editing, academicYear: e.target.value })}
                    placeholder="1447-1448" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>العام الميلادي</label>
                  <input value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })}
                    placeholder="2025/2026" style={inputStyle} />
                </div>
              </div>

              <div style={{ background: '#eef2ff', borderRadius: '10px', padding: '16px', border: '1px solid #c7d2fe' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', marginBottom: '12px' }}>الفصل الأول</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>بداية</label>
                    <input type="date" value={toDateInput(editing.semester1Start || '')}
                      onChange={e => setEditing({ ...editing, semester1Start: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>نهاية</label>
                    <input type="date" value={toDateInput(editing.semester1End || '')}
                      onChange={e => setEditing({ ...editing, semester1End: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ background: '#ecfdf5', borderRadius: '10px', padding: '16px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669', marginBottom: '12px' }}>الفصل الثاني</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>بداية</label>
                    <input type="date" value={toDateInput(editing.semester2Start || '')}
                      onChange={e => setEditing({ ...editing, semester2Start: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>نهاية</label>
                    <input type="date" value={toDateInput(editing.semester2End || '')}
                      onChange={e => setEditing({ ...editing, semester2End: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>أيام الاحتياط بعد نهاية كل فصل</label>
                <input type="number" value={editing.bufferDays || 4}
                  onChange={e => setEditing({ ...editing, bufferDays: parseInt(e.target.value) || 4 })}
                  style={{ ...inputStyle, maxWidth: '120px' }} />
              </div>

              <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                {saving ? 'جاري الحفظ...' : 'حفظ التقويم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ أنماط مشتركة ═══
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl',
};

const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '520px',
  maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8',
  cursor: 'pointer', lineHeight: 1,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px', borderRadius: '10px',
  border: '2px solid #e2e8f0', outline: 'none', fontFamily: "'Cairo', sans-serif",
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700,
  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
  border: 'none', borderRadius: '10px', cursor: 'pointer',
  fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: '8px',
};

const cellStyle: React.CSSProperties = {
  padding: '12px 16px', whiteSpace: 'nowrap',
};

const actionBtnStyle = (color: string, bg: string): React.CSSProperties => ({
  width: '32px', height: '32px', borderRadius: '8px', border: 'none',
  background: bg, color, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
});
