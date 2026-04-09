import React from 'react';

interface Props {
  icon: string;        // Material Symbols icon name
  title: string;
  color: string;
  hoverBg?: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean; // highlight required forms
}

// ★ Pulse animation — يُحقن مرة واحدة فقط في الصفحة
let styleInjected = false;
function injectPulseStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes action-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { transform: scale(1.12); box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.25); }
    }
    .action-icon-pulse {
      animation: action-pulse 2s ease-in-out infinite;
    }
    .action-icon-pulse::before {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 7px;
      height: 7px;
      background: #ef4444;
      border-radius: 50%;
      border: 1.5px solid #fff;
    }
  `;
  document.head.appendChild(style);
}

/**
 * ActionIcon — أيقونة إجراء في صفوف الجدول
 * highlight = true → الأيقونة تنبض بحركة خفيفة + نقطة حمراء + tooltip "⚠ مطلوب"
 */
const ActionIcon: React.FC<Props> = ({ icon, title, color, hoverBg, onClick, disabled, highlight }) => {
  if (highlight) injectPulseStyle();

  const displayTitle = highlight ? `⚠ مطلوب: ${title}` : title;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={displayTitle}
      className={highlight ? 'action-icon-pulse' : ''}
      style={{
        position: 'relative',
        padding: 6,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        if (!disabled && hoverBg) (e.currentTarget.style.background = hoverBg);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
    </button>
  );
};

export default ActionIcon;
