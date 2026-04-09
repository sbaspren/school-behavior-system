import React from 'react';

export interface ActionButton {
  icon: string;       // Material Symbols icon name
  label: string;
  variant: 'primary' | 'outline' | 'success' | 'danger';
  onClick: () => void;
  disabled?: boolean;
  id?: string;
  dropdown?: React.ReactNode;
}

interface Props {
  leftButtons: ActionButton[];
  rightButtons?: ActionButton[];
  sectionColor: string;
}

const variantStyles = (_variant: string, sectionColor: string): React.CSSProperties => {
  // ★ توحيد: كل الأزرار outline — خلفية بيضاء + حدود ونص بلون القسم
  return {
    background: '#fff',
    color: sectionColor,
    border: `1.5px solid ${sectionColor}`,
  };
};

/**
 * ActionBar — مطابق لـ .action-bar + .action-group + .btn-hero في CSS_Styles.html (سطر 463-473)
 */
const ActionBar: React.FC<Props> = ({ leftButtons, rightButtons, sectionColor }) => {
  const renderButton = (btn: ActionButton, idx: number) => (
    <button
      key={idx}
      id={btn.id}
      onClick={btn.onClick}
      disabled={btn.disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 18px',
        borderRadius: 12,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: btn.disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        opacity: btn.disabled ? 0.5 : 1,
        ...variantStyles(btn.variant, sectionColor),
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{btn.icon}</span>
      {btn.label}
    </button>
  );

  return (
    <div style={{
      margin: '0 0 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {leftButtons.map(renderButton)}
      </div>
      {rightButtons && rightButtons.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {rightButtons.map(renderButton)}
        </div>
      )}
    </div>
  );
};

export default ActionBar;
