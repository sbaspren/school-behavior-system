import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { SETTINGS_STAGES } from '../utils/constants';

const StageTabs: React.FC = () => {
  const { enabledStages, activeStage, setActiveStage, showStageTabs } = useAppContext();

  if (!showStageTabs) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '0 4px',
    }}>
      {enabledStages.map((stage) => {
        const info = SETTINGS_STAGES.find(s => s.id === stage.stage);
        const label = info?.name || stage.stage;
        const isActive = activeStage === stage.stage;

        return (
          <button
            key={stage.stage}
            onClick={() => setActiveStage(stage.stage)}
            style={{
              position: 'relative',
              padding: '6px 18px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#4f46e5' : '#6b7280',
              background: isActive ? '#eef2ff' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {label}
            {/* Google-style active indicator line */}
            {isActive && (
              <span style={{
                position: 'absolute',
                bottom: '-6px',
                left: '20%',
                right: '20%',
                height: '3px',
                background: '#4f46e5',
                borderRadius: '3px 3px 0 0',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StageTabs;
