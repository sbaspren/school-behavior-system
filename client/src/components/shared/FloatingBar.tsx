import React from 'react';

export interface FloatingAction {
  icon: string;
  label: string;
  /** 'send' = green, 'delete' = red, 'print' = white, or custom hex color */
  variant?: 'send' | 'delete' | 'print' | 'default';
  color?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  count: number;
  actions: FloatingAction[];
  onCancel: () => void;
}

const VARIANT_COLORS: Record<string, string> = {
  send: '#a7f3d0',
  delete: '#fca5a5',
  print: '#fff',
  default: '#fff',
};

/**
 * FloatingBar — شريط الإجراءات العائم الموحّد
 * يظهر عند تحديد سجلات — تصميم واحد لكل الصفحات
 */
const FloatingBar: React.FC<Props> = ({ count, actions, onCancel }) => {
  if (count === 0) return null;
  return (
    <div className="no-print" style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(30, 41, 59, 0.95)',
      color: '#fff',
      borderRadius: 100,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
      animation: 'floatBarIn 0.3s ease',
    }}>
      {/* Count */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{count}</span>
        <span style={{ fontSize: 13 }}>محدد</span>
      </span>

      {/* Divider */}
      <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.3)' }} />

      {/* Actions */}
      {actions.map((a, i) => {
        const textColor = a.color || VARIANT_COLORS[a.variant || 'default'];
        return (
          <button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: textColor,
              cursor: a.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              opacity: a.disabled ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>{a.icon}</span>
            {a.label}
          </button>
        );
      })}

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          fontSize: 16,
          fontFamily: 'inherit',
          marginRight: 4,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
};

export default FloatingBar;
