import React, { useState } from 'react';
import api from '../../api/client';
import { showSuccess, showError } from './Toast';

interface Props {
  onClose: () => void;
}

// Modal تغيير كلمة المرور — مشترك لكل الأدوار.
// يستدعي POST /api/auth/change-password.
const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const handleSave = async () => {
    if (!current.trim()) { showError('أدخل كلمة المرور الحالية'); return; }
    if (next.length < 6) { showError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (next !== confirm) { showError('تأكيد كلمة المرور لا يطابق'); return; }

    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      if (res.data?.success) {
        showSuccess('تم تغيير كلمة المرور بنجاح');
        onClose();
      } else {
        showError(res.data?.message || 'فشل التغيير');
      }
    } catch {
      showError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const inputWrap: React.CSSProperties = { position: 'relative' };
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', paddingInlineEnd: 38,
    borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14,
  };
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 20px', background: 'linear-gradient(to left, #eef2ff, #faf5ff)',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>تغيير كلمة المرور</h3>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
              كلمة المرور الحالية
            </label>
            <div style={inputWrap}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current} onChange={(e) => setCurrent(e.target.value)}
                style={input} autoFocus
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={eyeBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showCurrent ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
              كلمة المرور الجديدة
            </label>
            <div style={inputWrap}>
              <input
                type={showNext ? 'text' : 'password'}
                value={next} onChange={(e) => setNext(e.target.value)}
                style={input} placeholder="6 أحرف على الأقل"
              />
              <button type="button" onClick={() => setShowNext(!showNext)} style={eyeBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showNext ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type={showNext ? 'text' : 'password'}
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              style={{ ...input, paddingInlineEnd: 12 }}
            />
          </div>
        </div>

        <div style={{
          padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose} disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave} disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: saving ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
              color: '#fff', cursor: saving ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
