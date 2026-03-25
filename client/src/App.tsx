import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/shared/Toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import NotificationBell from './components/NotificationBell';
import LoginPage, { AuthUser } from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import SubscriptionExpiredPage from './pages/SubscriptionExpiredPage';
import { useAppContext } from './hooks/useAppContext';
import { licensesApi } from './api/licenses';
import { AppProvider } from './contexts/AppContext';
import SettingsPage from './pages/SettingsPage';
import ViolationsPage from './pages/violations';
import PositiveBehaviorPage from './pages/PositiveBehaviorPage';
import TardinessPage from './pages/TardinessPage';
import AbsencePage from './pages/absence';
import PermissionsPage from './pages/PermissionsPage';
import EducationalNotesPage from './pages/EducationalNotesPage';
import DashboardPage from './pages/DashboardPage';
import WhatsAppPage from './pages/WhatsAppPage';
import CommunicationPage from './pages/CommunicationPage';
import NoorPage from './pages/NoorPage';
import AcademicPage from './pages/AcademicPage';
import ParentExcusePage from './pages/ParentExcusePage';
import TeacherFormPage from './pages/TeacherFormPage';
import StaffFormPage from './pages/StaffFormPage';
import GuardDisplayPage from './pages/GuardDisplayPage';
import WakeelFormPage from './pages/WakeelFormPage';
import CounselorFormPage from './pages/CounselorFormPage';
import AdminTardinessPage from './pages/AdminTardinessPage';
import AttendancePage from './pages/AttendancePage';
import AuditLogPage from './pages/AuditLogPage';
import ReportsPage from './pages/ReportsPage';
import GeneralFormsPage from './pages/GeneralFormsPage';
import HistoryPage from './pages/HistoryPage';
import ParentExcusePublicPage from './pages/ParentExcusePublicPage';
import './App.css';

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ═══ حماية المسارات حسب الدور ═══
const ROUTE_ROLES: Record<string, string[]> = {
  '/settings':       ['Admin'],
  '/whatsapp':       ['Admin', 'Deputy'],
  '/tardiness':      ['Admin', 'Deputy', 'Counselor', 'Guard'],
  '/permissions':    ['Admin', 'Deputy', 'Counselor', 'Guard'],
  '/absence':        ['Admin', 'Deputy', 'Counselor'],
  '/general-forms':  ['Admin', 'Deputy', 'Counselor'],
  '/noor':           ['Admin', 'Deputy', 'Counselor'],
  '/communication':  ['Admin', 'Deputy', 'Counselor'],
  '/parent-excuse':  ['Admin', 'Deputy', 'Counselor'],
};

function ProtectedRoute({ role, path, children }: { role: string; path: string; children: React.ReactNode }) {
  const allowed = ROUTE_ROLES[path];
  if (allowed && !allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Authenticated layout — reads settings/stages from AppContext (no redundant API calls) */
function AuthenticatedLayout({ user, onLogout, expiringBanner }: {
  user: AuthUser;
  onLogout: () => void;
  expiringBanner: { days: number } | null;
}) {
  const { schoolSettings, refresh } = useAppContext();
  const schoolName = schoolSettings.schoolName || '';
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  return (
    <div style={{ display: 'flex', direction: 'rtl', fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif", minHeight: '100vh' }}>
      <Sidebar open={true} role={user.role} schoolName={schoolName} whatsAppMode={schoolSettings.whatsAppMode} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Header */}
        <header className="no-print" style={{
          background: '#fff', borderBottom: '1px solid #f0f2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px', height: '52px', minHeight: '52px',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)', zIndex: 10, gap: '8px',
        }}>
          <NotificationBell />
          <button
            id="refreshBtn"
            onClick={handleRefresh}
            style={{
              opacity: refreshing ? 0.5 : 1, pointerEvents: refreshing ? 'none' : 'auto',
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', background: '#f8f7ff', color: '#4f46e5',
              borderRadius: '8px', border: '1px solid #e8e8ff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              transition: 'all .2s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            تحديث
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: '#fafbfc', borderRadius: '10px', border: '1px solid #f0f2f7' }}>
            <span style={{ fontSize: '13px', color: '#1a1d2e', fontWeight: 700 }}>{user.name}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5db' }} />
            <span style={{ fontSize: '11px', color: '#9da3b8', fontWeight: 600 }}>{user.role}</span>
          </div>
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', background: '#fef2f2', color: '#dc2626',
            borderRadius: '8px', border: '1px solid #fecaca', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            transition: 'all .2s ease',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>logout</span>
            خروج
          </button>
        </header>

        {/* Subscription expiring banner */}
        {expiringBanner && (
          <div className="no-print" style={{
            background: '#fef3c7', borderBottom: '1px solid #fbbf24',
            padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px', color: '#92400e', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
            اشتراكك ينتهي خلال {expiringBanner.days} يوم. تواصل مع الدعم للتجديد.
          </div>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f4f5f9' }}>
          <Routes>
            <Route path="/violations" element={<ViolationsPage />} />
            <Route path="/behavior-history" element={<HistoryPage />} />
            <Route path="/positive" element={<PositiveBehaviorPage />} />
            <Route path="/tardiness" element={<ProtectedRoute role={user.role} path="/tardiness"><TardinessPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/absence" element={<ProtectedRoute role={user.role} path="/absence"><AbsencePage /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute role={user.role} path="/permissions"><PermissionsPage /></ProtectedRoute>} />
            <Route path="/notes" element={<EducationalNotesPage />} />
            <Route path="/whatsapp" element={
              user.role === 'Deputy' && schoolSettings.whatsAppMode === 'Unified'
                ? <Navigate to="/" replace />
                : <ProtectedRoute role={user.role} path="/whatsapp"><WhatsAppPage /></ProtectedRoute>
            } />
            <Route path="/communication" element={<ProtectedRoute role={user.role} path="/communication"><CommunicationPage /></ProtectedRoute>} />
            <Route path="/noor" element={<ProtectedRoute role={user.role} path="/noor"><NoorPage /></ProtectedRoute>} />
            <Route path="/academic" element={<AcademicPage />} />
            <Route path="/parent-excuse" element={<ProtectedRoute role={user.role} path="/parent-excuse"><ParentExcusePage /></ProtectedRoute>} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/general-forms" element={<ProtectedRoute role={user.role} path="/general-forms"><GeneralFormsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute role={user.role} path="/settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <div id="print-container" />
      <MobileNav role={user.role} whatsAppMode={schoolSettings.whatsAppMode} />
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null); // null = loading
  const [subscriptionExpired, setSubscriptionExpired] = useState(
    () => localStorage.getItem('subscription_expired') === '1'
  );
  const [expiringBanner, setExpiringBanner] = useState<{ days: number } | null>(null);
  const location = useLocation();

  // ── فحص التفعيل الأولي ──
  useEffect(() => {
    licensesApi.checkSetup()
      .then(res => {
        setNeedsSetup(res.data?.data?.needsSetup ?? false);
      })
      .catch(() => setNeedsSetup(false));
  }, []);

  // ── الاستماع لحدث انتهاء الاشتراك من axios interceptor ──
  useEffect(() => {
    const handler = () => setSubscriptionExpired(true);
    window.addEventListener('subscription-expired', handler);
    return () => window.removeEventListener('subscription-expired', handler);
  }, []);

  // ── فحص حالة الاشتراك بعد تسجيل الدخول ──
  useEffect(() => {
    if (!user) return;
    licensesApi.getStatus()
      .then(res => {
        const d = res.data?.data;
        if (d?.isExpired) {
          setSubscriptionExpired(true);
          localStorage.setItem('subscription_expired', '1');
        } else {
          setSubscriptionExpired(false);
          localStorage.removeItem('subscription_expired');
          if (d?.isExpiringSoon) {
            setExpiringBanner({ days: d.daysRemaining });
          }
        }
      })
      .catch(() => { /* silent */ });
  }, [user]);

  const handleLogin = useCallback((_token: string, u: AuthUser) => {
    setNeedsSetup(false);
    setSubscriptionExpired(false);
    localStorage.removeItem('subscription_expired');
    setUser(u);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('subscription_expired');
    setUser(null);
    setSubscriptionExpired(false);
  }, []);

  // Public routes — no auth required
  if (location.pathname === '/form') {
    return <TeacherFormPage />;
  }
  if (location.pathname === '/staff-form') {
    return <StaffFormPage />;
  }
  if (location.pathname === '/guard') {
    return <GuardDisplayPage />;
  }
  if (location.pathname === '/wakeel-form') {
    return <WakeelFormPage />;
  }
  if (location.pathname === '/counselor-form') {
    return <CounselorFormPage />;
  }
  if (location.pathname === '/admin-tardiness') {
    return <AdminTardinessPage />;
  }
  if (location.pathname === '/parent-excuse-form') {
    return <ParentExcusePublicPage />;
  }

  // Loading setup check
  if (needsSetup === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>جاري التحميل...</p>
      </div>
    );
  }

  // First-time setup → show activation page
  if (needsSetup) {
    return <SetupPage onSetupComplete={handleLogin} />;
  }

  // Subscription expired → show expired page
  if (subscriptionExpired && user) {
    return <SubscriptionExpiredPage onLogout={handleLogout} />;
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppProvider>
      <AuthenticatedLayout user={user} onLogout={handleLogout} expiringBanner={expiringBanner} />
    </AppProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
