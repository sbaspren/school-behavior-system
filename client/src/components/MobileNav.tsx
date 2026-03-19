import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface Props {
  role?: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  iconColor: string;
  roles?: string[];
}

/* All navigation items — mirrors Sidebar.tsx NAV_ITEMS */
const ALL_NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'لوحة المتابعة', icon: 'dashboard', iconColor: '#4f46e5' },
  { path: '/violations', label: 'المخالفات السلوكية', icon: 'gavel', iconColor: '#6366f1' },
  { path: '/notes', label: 'الملاحظات التربوية', icon: 'menu_book', iconColor: '#10b981' },
  { path: '/academic', label: 'التحصيل الدراسي', icon: 'analytics', iconColor: '#14b8a6' },
  { path: '/tardiness', label: 'التأخر', icon: 'timer_off', iconColor: '#ef4444', roles: ['Admin', 'Deputy', 'Counselor', 'Guard'] },
  { path: '/permissions', label: 'الاستئذان', icon: 'exit_to_app', iconColor: '#06b6d4', roles: ['Admin', 'Deputy', 'Counselor', 'Guard'] },
  { path: '/absence', label: 'الغياب', icon: 'event_busy', iconColor: '#f97316', roles: ['Admin', 'Deputy', 'Counselor'] },
  { path: '/general-forms', label: 'النماذج العامة', icon: 'folder_open', iconColor: '#f97316', roles: ['Admin', 'Deputy', 'Counselor'] },
  { path: '/noor', label: 'التوثيق في نور', icon: 'cloud_sync', iconColor: '#00897b', roles: ['Admin', 'Deputy', 'Counselor'] },
  { path: '/whatsapp', label: 'أدوات واتساب', icon: 'chat', iconColor: '#22c55e', roles: ['Admin', 'Deputy'] },
  { path: '/communication', label: 'سجل التواصل', icon: 'history', iconColor: '#3b82f6', roles: ['Admin', 'Deputy', 'Counselor'] },
  { path: '/settings', label: 'الإعدادات', icon: 'settings', iconColor: '#64748b', roles: ['Admin'] },
];

/* The 4 primary bottom-bar items (the 5th slot is the "More" button) */
const PRIMARY_PATHS = ['/', '/violations', '/absence', '/tardiness'];

const MobileNav: React.FC<Props> = ({ role }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  /* Close the "More" panel whenever the route changes */
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  /* Role-based filtering — same logic as Sidebar.tsx */
  const visibleItems = ALL_NAV_ITEMS.filter(
    item => !item.roles || (role && item.roles.includes(role)),
  );

  const primaryItems = visibleItems.filter(item => PRIMARY_PATHS.includes(item.path));
  const moreItems = visibleItems.filter(item => !PRIMARY_PATHS.includes(item.path));

  /* Is any "more" route currently active? */
  const moreIsActive = moreItems.some(
    item => item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path),
  );

  return (
    <>
      {/* ── Overlay (behind the slide-up panel) ── */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}

      {/* ── Slide-up "More" panel ── */}
      {moreOpen && (
        <div style={{
          position: 'fixed',
          bottom: '64px',
          left: 0,
          right: 0,
          background: '#fff',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          zIndex: 999,
          maxHeight: '60vh',
          overflowY: 'auto',
          animation: 'mobileNavSlideUp 0.25s cubic-bezier(.4,0,.2,1)',
          direction: 'rtl',
        }}>
          {/* Handle bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 4px',
          }}>
            <div style={{
              width: '36px',
              height: '4px',
              borderRadius: '100px',
              background: '#d1d5db',
            }} />
          </div>

          {/* Header */}
          <div style={{
            padding: '4px 20px 12px',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--c-text)',
            borderBottom: '1px solid var(--c-border-light)',
          }}>
            المزيد
          </div>

          {/* Items */}
          <div style={{ padding: '8px 12px 16px' }}>
            {moreItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMoreOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'var(--c-text-secondary)',
                  background: isActive ? 'var(--c-primary)' : 'transparent',
                  marginBottom: '2px',
                  transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '22px',
                        color: isActive ? '#fff' : item.iconColor,
                        WebkitTextFillColor: isActive ? '#fff' : undefined,
                        background: isActive ? 'none' : undefined,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom navigation bar ── */}
      <nav
        className="mobile-bottom-nav no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: '#fff',
          borderTop: '1px solid var(--c-border)',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1000,
          direction: 'rtl',
        }}
      >
        {primaryItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              flex: 1,
              height: '100%',
              textDecoration: 'none',
              color: isActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
              transition: 'color 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '24px',
                    color: isActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
                    WebkitTextFillColor: isActive ? 'var(--c-primary)' : undefined,
                    background: isActive ? 'none' : undefined,
                  }}
                >
                  {item.icon}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 500,
                  lineHeight: 1,
                }}>
                  {item.path === '/' ? 'لوحة المتابعة'
                    : item.path === '/violations' ? 'المخالفات'
                    : item.path === '/absence' ? 'الغياب'
                    : item.path === '/tardiness' ? 'التأخر'
                    : item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* "More" button */}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            flex: 1,
            height: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: moreOpen || moreIsActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
            transition: 'color 0.15s ease',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '24px',
              color: moreOpen || moreIsActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
              WebkitTextFillColor: moreOpen || moreIsActive ? 'var(--c-primary)' : undefined,
              background: 'none',
            }}
          >
            {moreOpen ? 'close' : 'settings'}
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: moreOpen || moreIsActive ? 700 : 500,
            lineHeight: 1,
          }}>
            المزيد
          </span>
        </button>
      </nav>

      {/* Inline keyframes for the slide-up animation */}
      <style>{`
        @keyframes mobileNavSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        /* Only show the mobile nav on small screens */
        .mobile-bottom-nav {
          display: none !important;
        }
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default MobileNav;
