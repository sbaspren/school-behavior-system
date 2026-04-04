import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  staffInputApi, StaffVerifyData, GuardPermissionRecord,
} from '../api/staffInput';
import { classToLetter } from '../utils/printUtils';
import { MF, ROLE_THEME, SEC_COLORS } from '../utils/mobileFormStyles';

const STAGE_MATERIAL_ICONS: Record<string, string> = {
  'طفولة مبكرة': 'child_care',
  'ابتدائي': 'school',
  'متوسط': 'menu_book',
  'ثانوي': 'history_edu',
};

const GuardDisplayPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [pageData, setPageData] = useState<StaffVerifyData | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [curStage, setCurStage] = useState('');
  const [records, setRecords] = useState<GuardPermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);

  const showToast = useCallback((msg: string, cls: string) => {
    setToast({ msg, cls });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Load initial data
  useEffect(() => {
    if (!token) { setError('لا يوجد رمز دخول'); setLoading(false); return; }
    staffInputApi.verify(token)
      .then(res => {
        const d = res.data?.data;
        if (!d?.success) { setError(d?.sn || 'رابط غير صالح أو منتهي'); return; }
        setPageData(d);
        // stages from enabled stages
        const s = d.enabledStages || ['متوسط', 'ثانوي'];
        setStages(s);
        if (s.length > 0) setCurStage(s[0]);
      })
      .catch(() => setError('رابط غير صالح أو حدث خطأ في الاتصال'))
      .finally(() => setLoading(false));
  }, [token]);

  // Load guard permissions
  const loadRecords = useCallback(async (stage?: string) => {
    if (!token) return;
    setRecordsLoading(true);
    try {
      const res = await staffInputApi.getGuardPermissions(token, stage);
      setRecords(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      showToast('خطأ في جلب السجلات', 'te');
    } finally {
      setRecordsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (curStage && pageData) loadRecords(curStage);
  }, [curStage, pageData, loadRecords]);

  const waitingCount = useMemo(() => records.filter(r => !r.confirmed).length, [records]);
  const doneCount = useMemo(() => records.filter(r => r.confirmed).length, [records]);

  const handleConfirmExit = useCallback(async (id: number) => {
    try {
      const res = await staffInputApi.confirmExit(id, token);
      const d = res.data?.data;
      if (d?.success) {
        setRecords(prev => prev.map(r =>
          r.id === id ? { ...r, confirmed: true, confirmationTime: d.confirmationTime || '' } : r
        ));
        showToast('تم تأكيد الخروج', 'ts');
      } else {
        showToast('فشل تأكيد الخروج', 'te');
      }
    } catch {
      showToast('حدث خطأ', 'te');
    }
  }, [token, showToast]);

  const [refreshSpin, setRefreshSpin] = useState(false);
  const doRefresh = () => {
    setRefreshSpin(true);
    loadRecords(curStage);
    setTimeout(() => setRefreshSpin(false), 1500);
  };

  // ── Render: Loading ──
  if (loading) return (
    <div style={MF.loadingPage}>
      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#9da3b8' }}>hourglass_empty</span>
      <div style={MF.loadingText}>جاري التحميل...</div>
    </div>
  );

  // ── Render: Error ──
  if (error || !pageData) return (
    <div style={MF.errorPage}>
      <span className="material-symbols-outlined" style={MF.errorIcon}>lock</span>
      <div style={MF.errorTitle}>رابط غير صالح</div>
      <div style={MF.errorMsg}>{error || 'تأكد من صحة الرابط'}</div>
    </div>
  );

  return (
    <div style={MF.page}>
      {/* Toast */}
      {toast && (
        <div style={{
          ...MF.toast,
          ...(toast.cls === 'ts' ? MF.toastSuccess : MF.toastError),
          opacity: 1,
          transform: 'translateX(-50%) translateY(0)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.cls === 'ts' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Accent Strip */}
      <div style={{ ...MF.accentStrip, background: ROLE_THEME.guard.color }} />

      {/* Header — sticky */}
      <div style={MF.header}>
        <div style={MF.headerRow}>
          <div style={MF.headerInfo}>
            <div style={{ ...MF.headerIcon, background: ROLE_THEME.guard.bg }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: ROLE_THEME.guard.color }}>security</span>
            </div>
            <div>
              <h1 style={MF.headerTitle}>سجل المستأذنين</h1>
              <div style={MF.headerSub}>{pageData.staff.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Tabs */}
      {stages.length > 0 && (
        <div style={MF.tabsBar}>
          {stages.map(stage => (
            <button
              key={stage}
              onClick={() => setCurStage(stage)}
              style={{
                ...MF.tab,
                ...(curStage === stage ? { ...MF.tabActive, background: ROLE_THEME.guard.color } : {}),
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {STAGE_MATERIAL_ICONS[stage] || 'category'}
              </span>
              {stage}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={MF.content}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#f59e0b' }} />
            <div style={{ ...MF.cardBody, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: '#f59e0b' }}>{waitingCount}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#5c6178', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>hourglass_empty</span>
                بانتظار الخروج
              </div>
            </div>
          </div>
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#16a34a' }} />
            <div style={{ ...MF.cardBody, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: '#16a34a' }}>{doneCount}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#5c6178', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                تم تأكيد خروجهم
              </div>
            </div>
          </div>
        </div>

        {/* Records */}
        {recordsLoading ? (
          <div style={MF.empty}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>hourglass_empty</span>
            جاري التحميل...
          </div>
        ) : records.length === 0 ? (
          <div style={MF.empty}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>inbox</span>
            لا يوجد مستأذنين اليوم
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {records.map(r => (
              <div key={r.id} style={{
                ...MF.card,
                borderRight: r.confirmed ? '5px solid #16a34a' : '5px solid #f59e0b',
                background: r.confirmed ? '#f0fdf4' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                marginBottom: 0,
              }}>
                <div style={{ flex: 1, padding: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1d2e', marginBottom: '4px' }}>{r.studentName}</div>
                  <div style={{ fontSize: '12px', color: '#5c6178', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>apartment</span>
                      {classToLetter(r.className)}
                    </span>
                    {r.reason && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                        {r.reason}
                      </span>
                    )}
                    {r.exitTime && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                        {r.exitTime}
                      </span>
                    )}
                    {r.confirmed && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                        خرج: {r.confirmationTime}
                      </span>
                    )}
                  </div>
                </div>
                {r.confirmed ? (
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#16a34a', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginLeft: '16px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#fff' }}>check</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmExit(r.id)}
                    style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      border: 'none', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginLeft: '16px',
                      background: '#f59e0b',
                      boxShadow: '0 4px 12px rgba(245,158,11,.3)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>meeting_room</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB Refresh */}
      <button onClick={doRefresh} style={{
        ...MF.refreshBtn,
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '16px 40px',
        borderRadius: '100px',
        background: ROLE_THEME.guard.color,
        color: '#fff',
        fontSize: '16px',
        fontWeight: 800,
        border: 'none',
        boxShadow: '0 6px 20px rgba(30,58,95,.3)',
        zIndex: 30,
      }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '20px',
            ...(refreshSpin ? { display: 'inline-block', animation: 'spin 0.8s linear infinite' } : {}),
          }}
        >sync</span>
        تحديث
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default GuardDisplayPage;
