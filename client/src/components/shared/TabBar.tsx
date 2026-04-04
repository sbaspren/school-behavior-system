import React from 'react';

export interface TabDef {
  id: string;
  label: string;
  icon: string;       // Material Symbols icon name
  badge?: number;
}

interface Props {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  sectionColor: string;  // e.g. '#4f46e5'
}

/**
 * TabBar — مطابق لـ .tabs-bar + .tab-item في CSS_Styles.html (سطر 455-460)
 * pill tabs مع Material Symbols icons + لون القسم
 */
const TabBar: React.FC<Props> = ({ tabs, activeTab, onTabChange, sectionColor }) => {
  return (
    <div style={{
      margin: '0 0 12px',
      background: '#fff',
      borderRadius: 16,
      padding: 6,
      display: 'flex',
      gap: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #f0f2f7',
      overflowX: 'auto',
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const hasBadge = tab.badge !== undefined && tab.badge > 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: isActive ? '#fff' : '#666',
              background: isActive ? sectionColor : 'none',
              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              border: 'none',
              transition: 'all 0.25s',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                color: isActive ? '#fff' : undefined,
                WebkitTextFillColor: isActive ? '#fff' : undefined,
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
            {hasBadge && (
              <span style={{
                background: isActive ? 'rgba(255,255,255,.25)' : '#ef4444',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1.2,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
