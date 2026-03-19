import React, { useState, useRef, useEffect } from 'react';
import { useSignalR } from '../hooks/useSignalR';

const NOTIF_ICONS: Record<string, string> = {
  violation: 'gavel',
  absence: 'event_busy',
  permission: 'exit_to_app',
  tardiness: 'timer_off',
  excuse: 'family_restroom',
  refresh: 'sync',
};

const NOTIF_COLORS: Record<string, string> = {
  violation: '#4f46e5',
  absence: '#f97316',
  permission: '#8b5cf6',
  tardiness: '#ef4444',
  excuse: '#f59e0b',
  refresh: '#10b981',
};

const NOTIF_LABELS: Record<string, string> = {
  violation: 'مخالفة جديدة',
  absence: 'غياب جديد',
  permission: 'استئذان جديد',
  tardiness: 'تأخر جديد',
  excuse: 'عذر جديد',
  refresh: 'تحديث البيانات',
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  return date.toLocaleDateString('ar-SA');
}

function buildMessage(type: string, data: any): string {
  switch (type) {
    case 'violation':
      return `${data.studentName} — ${data.violation} (درجة ${data.degree})`;
    case 'absence':
      return `${data.studentName} — ${data.className}`;
    case 'permission':
      return `${data.studentName} — ${data.reason}`;
    case 'tardiness':
      return `${data.studentName} — ${data.minutes} دقيقة`;
    case 'excuse':
      return `${data.studentName} — ${data.excuseText}`;
    case 'refresh':
      return 'تم تحديث لوحة المعلومات';
    default:
      return JSON.stringify(data);
  }
}

const NotificationBell: React.FC = () => {
  const { connected, notifications, clearNotifications } = useSignalR();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.length - seen;

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open) {
      setSeen(notifications.length);
    }
    setOpen(prev => !prev);
  };

  const handleClear = () => {
    clearNotifications();
    setSeen(0);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '12px',
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        title="الإشعارات"
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 24,
            color: open ? '#4f46e5' : '#64748b',
            transition: 'color 0.2s',
          }}
        >
          notifications
        </span>

        {/* Connection dot */}
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            border: '2px solid #fff',
          }}
        />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#ef4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #fff',
              fontFamily: "'Cairo', sans-serif",
              animation: 'notif-pulse 0.3s ease-out',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 360,
            maxHeight: 440,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            direction: 'rtl',
            fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
            animation: 'notif-slide-in 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafbfc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: '#4f46e5' }}
              >
                notifications_active
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                الإشعارات
              </span>
              {notifications.length > 0 && (
                <span
                  style={{
                    background: '#eef2ff',
                    color: '#4f46e5',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 8,
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'all 0.2s',
                  fontFamily: "'Cairo', sans-serif",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'none';
                }}
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.5 }}
                >
                  notifications_off
                </span>
                <div style={{ fontSize: 13, fontWeight: 600 }}>لا توجد إشعارات</div>
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const icon = NOTIF_ICONS[notif.type] || 'info';
                const color = NOTIF_COLORS[notif.type] || '#64748b';
                const label = NOTIF_LABELS[notif.type] || notif.type;
                const message = buildMessage(notif.type, notif.data);

                return (
                  <div
                    key={`${notif.timestamp}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 18px',
                      borderBottom: idx < notifications.length - 1 ? '1px solid #f8fafc' : 'none',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${color}14`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color }}
                      >
                        {icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color,
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#334155',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          marginTop: 2,
                        }}
                      >
                        {formatTime(notif.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with connection status */}
          <div
            style={{
              padding: '8px 18px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfc',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: connected ? '#22c55e' : '#ef4444',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              {connected ? 'متصل' : 'غير متصل'}
            </span>
          </div>
        </div>
      )}

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes notif-pulse {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
