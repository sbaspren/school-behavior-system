import React from 'react';

export interface InputModalProps {
  title: string;
  icon: string;
  /** Header gradient or solid background */
  headerBg: string;
  /** Header text color */
  headerColor?: string;
  /** Primary action button color */
  accentColor: string;
  /** Footer save button label */
  saveLabel?: string;
  /** Footer counter text (e.g. "2 طالب محدد") */
  counterText?: string;
  /** Max width of the modal */
  maxWidth?: number;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

/**
 * InputModal — الإطار المشترك لجميع نماذج الإدخال
 * هيدر ملون + محتوى + فوتر (إلغاء + حفظ + عداد)
 */
const InputModal: React.FC<InputModalProps> = ({
  title,
  icon,
  headerBg,
  headerColor = '#fff',
  accentColor,
  saveLabel = 'حفظ',
  counterText = '',
  maxWidth = 640,
  saving = false,
  onClose,
  onSave,
  children,
}) => (
  <div
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{
      background: '#fff', borderRadius: 20,
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      width: '100%', maxWidth,
      maxHeight: '90vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      animation: 'modalIn 0.2s ease',
    }}>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: headerBg,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0, fontSize: 18, fontWeight: 700,
          color: headerColor,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{
            padding: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: headerColor, opacity: 0.8,
            fontSize: 20, lineHeight: 1,
          }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Body */}
      <div style={{
        padding: 24, overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{counterText}</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', color: '#4b5563', background: 'none',
              border: 'none', cursor: 'pointer', fontWeight: 700,
              fontFamily: 'inherit', fontSize: 14,
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '10px 28px', background: accentColor, color: '#fff',
              borderRadius: 8, fontWeight: 700, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontSize: 14, fontFamily: 'inherit',
            }}
          >
            {saving ? 'جاري الحفظ...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default InputModal;
