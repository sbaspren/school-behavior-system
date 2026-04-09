import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { SETTINGS_STAGES } from '../utils/constants';

const STAGE_ICONS: Record<string, string> = {
  Kindergarten: 'child_care',
  Primary: 'boy',
  Intermediate: 'backpack',
  Secondary: 'school',
};

const StageTabs: React.FC = () => {
  const { enabledStages, activeStage, setActiveStage, showStageTabs } = useAppContext();

  if (!showStageTabs) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: '#f3f4f6',
      borderRadius: '12px',
      padding: '4px',
    }}>
      {enabledStages.map((stage) => {
        const info = SETTINGS_STAGES.find(s => s.id === stage.stage);
        const label = info?.name || stage.stage;
        const isActive = activeStage === stage.stage;
        const icon = STAGE_ICONS[stage.stage] || 'school';

        return (
          <button
            key={stage.stage}
            onClick={() => setActiveStage(stage.stage)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: isActive ? 800 : 600,
              color: isActive ? '#fff' : '#6b7280',
              background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: '18px',
              color: isActive ? '#fff' : '#9ca3af',
            }}>{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default StageTabs;
