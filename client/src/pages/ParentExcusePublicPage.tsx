import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { parentExcuseApi } from '../api/parentExcuse';
import { MF, ROLE_THEME } from '../utils/mobileFormStyles';

interface StudentData {
  id: string;
  name: string;
  grade: string;
  section: string;
  stage: string;
}

interface PageData {
  success: boolean;
  error?: string;
  schoolName?: string;
  student?: StudentData;
  absence?: { excused: number; unexcused: number; late: number };
  today?: { date: string; day: string };
}

/** تحويل تاريخ ميلادي (YYYY-MM-DD) إلى هجري */
function toHijri(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

const themeColor = ROLE_THEME.parent.color;

const ParentExcusePublicPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [error, setError] = useState('');
  const [excuseText, setExcuseText] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const token = new URLSearchParams(window.location.search).get('token') || '';

  useEffect(() => {
    if (!token) {
      setError('الرابط غير صالح — لا يوجد رمز');
      setLoading(false);
      return;
    }
    parentExcuseApi.verifyToken(token).then((res) => {
      const d = res.data?.data;
      if (d && d.success !== false) {
        setPageData({ success: true, ...d });
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setAbsenceDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setError(d?.error || d?.message || 'رابط غير صالح أو منتهي الصلاحية');
      }
    }).catch(() => {
      setError('خطأ في الاتصال بالسيرفر');
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (excuseText.trim().length < 5) { alert('يرجى كتابة سبب الغياب (5 أحرف على الأقل)'); return; }
    if (excuseText.length > 500) { alert('سبب الغياب يجب ألا يتجاوز 500 حرف'); return; }
    setSubmitting(true);
    try {
      const res = await parentExcuseApi.submitExcuse({ token, reason: excuseText, hasAttachment, absenceDate });
      const d = res.data?.data || res.data;
      if (d?.success !== false) {
        setSuccessMessage(d?.message || 'تم إرسال العذر بنجاح');
        setSubmitted(true);
      } else {
        alert('خطأ: ' + (d?.error || d?.message || 'غير معروف'));
      }
    } catch { alert('خطأ في الإرسال'); }
    finally { setSubmitting(false); }
  };

  const handleExit = () => {
    try { window.close(); } catch { /* noop */ }
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;font-family:inherit;direction:rtl"><div><div style="font-size:64px;margin-bottom:16px"><span class="material-symbols-outlined" style="font-size:16px;color:#15803d">check_circle</span></div><h2 style="font-size:20px;font-weight:800;color:#1f2937;margin-bottom:8px">يمكنك إغلاق هذه الصفحة</h2><p style="color:#6b7280;font-size:14px">تم تسجيل العذر بنجاح</p></div></div>';
  };

  // Loading screen
  if (loading) {
    return (
      <div style={MF.loadingPage}>
        <LoadingSpinner />
        <span style={MF.loadingText}>جاري التحميل...</span>
      </div>
    );
  }

  // Error screen
  if (error || !pageData?.success) {
    return (
      <div style={MF.errorPage}>
        <span className="material-symbols-outlined" style={MF.errorIcon}>error</span>
        <h2 style={MF.errorTitle}>خطأ</h2>
        <p style={MF.errorMsg}>{error || pageData?.error || 'خطأ غير معروف'}</p>
      </div>
    );
  }

  const student = pageData.student!;
  const absence = pageData.absence || { excused: 0, unexcused: 0, late: 0 };
  const todayISO = new Date().toISOString().split('T')[0];

  // Success screen
  if (submitted) {
    return (
      <div style={MF.page}>
        <div style={{ ...MF.accentStrip, background: themeColor }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 4px)', padding: '32px 16px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: themeColor, marginBottom: 16 }}>check_circle</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d2e', marginBottom: 8 }}>تم إرسال العذر بنجاح!</h2>
          <p style={{ color: '#5c6178', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>{successMessage}</p>

          <div style={{ ...MF.card, width: '100%', maxWidth: 480, textAlign: 'right' }}>
            <div style={{ ...MF.cardAccent, background: themeColor }} />
            <div style={MF.cardBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, borderBottom: '1px solid #e8ebf2' }}>
                <span style={{ color: '#5c6178' }}>الطالب:</span>
                <span style={{ fontWeight: 700 }}>{student.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, borderBottom: '1px solid #e8ebf2' }}>
                <span style={{ color: '#5c6178' }}>الصف:</span>
                <span style={{ fontWeight: 700 }}>{student.grade} - {student.section}</span>
              </div>
              {absenceDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, borderBottom: '1px solid #e8ebf2' }}>
                  <span style={{ color: '#5c6178' }}>تاريخ الغياب:</span>
                  <span style={{ fontWeight: 700 }}>{toHijri(absenceDate)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, borderBottom: '1px solid #e8ebf2' }}>
                <span style={{ color: '#5c6178' }}>العذر:</span>
                <span style={{ fontWeight: 700, maxWidth: 200, textAlign: 'left', fontSize: excuseText.length > 40 ? 13 : 14 }}>{excuseText.substring(0, 80) + (excuseText.length > 80 ? '...' : '')}</span>
              </div>
              {hasAttachment && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14 }}>
                  <span style={{ color: '#5c6178' }}>المرفقات:</span>
                  <span style={{ fontWeight: 700, color: themeColor }}>ستُسلم مع الطالب</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ ...MF.card, width: '100%', maxWidth: 480, marginTop: 8 }}>
            <div style={{ ...MF.cardAccent, background: '#f59e0b' }} />
            <div style={{ ...MF.cardBody, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>info</span>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', lineHeight: 1.6, margin: 0, textAlign: 'right' }}>في حال وجود مرفقات، يرجى تسليمها مع الطالب عند حضوره للمدرسة.</p>
            </div>
          </div>

          <button onClick={handleExit} style={{ ...MF.logBtn, width: '100%', maxWidth: 480, marginTop: 16, justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            إغلاق الصفحة
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div style={MF.page}>
      {/* Accent strip */}
      <div style={{ ...MF.accentStrip, background: themeColor }} />

      {/* Header */}
      <div style={MF.header}>
        <div style={MF.headerRow}>
          <div style={MF.headerInfo}>
            <div style={{ ...MF.headerIcon, background: ROLE_THEME.parent.bg }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: themeColor }}>family_restroom</span>
            </div>
            <div>
              <div style={MF.headerTitle}>{pageData.schoolName || 'نموذج عذر الغياب'}</div>
              <div style={MF.headerSub}>نموذج تقديم عذر غياب</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={MF.content}>
        {/* Student info card */}
        <div style={{ ...MF.card, marginTop: 12 }}>
          <div style={{ ...MF.cardAccent, background: themeColor }} />
          <div style={{ ...MF.cardBody, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: themeColor }}>person</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#1a1d2e', fontSize: 15 }}>{student.name}</div>
              <div style={{ fontSize: 12, color: '#5c6178' }}>{student.grade} - {student.section}</div>
            </div>
          </div>
        </div>

        {/* Date bar */}
        <div style={MF.card}>
          <div style={{ ...MF.cardBody, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#5c6178' }}>calendar_today</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{pageData.today?.day || ''} - {pageData.today?.date || ''}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#ef4444' }} />
            <div style={{ ...MF.cardBody, textAlign: 'center', padding: '16px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ef4444', marginBottom: 4, display: 'block' }}>warning</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{absence.unexcused}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5c6178', marginTop: 4 }}>غياب بدون عذر</div>
            </div>
          </div>
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#3b82f6' }} />
            <div style={{ ...MF.cardBody, textAlign: 'center', padding: '16px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6', marginBottom: 4, display: 'block' }}>check_circle</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{absence.excused}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5c6178', marginTop: 4 }}>غياب بعذر</div>
            </div>
          </div>
        </div>

        {/* Warning box */}
        <div style={MF.card}>
          <div style={{ ...MF.cardAccent, background: '#f59e0b' }} />
          <div style={{ ...MF.cardBody, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>warning</span>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', lineHeight: 1.6 }}>
              تنبيه: الطالب الذي يتجاوز غيابه <strong>18 يوم دراسي بدون عذر</strong> يُحرم من دخول الاختبارات حسب لائحة الانتظام الدراسي.
            </div>
          </div>
        </div>

        {/* Absence date */}
        <div style={MF.card}>
          <div style={{ ...MF.cardAccent, background: themeColor }} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: themeColor }}>calendar_today</span>
              تاريخ الغياب
            </div>
            <div style={{ fontSize: 12, color: '#5c6178', marginBottom: 12 }}>حدد يوم أو أيام الغياب</div>
            <input type="date" value={absenceDate} onChange={(e) => setAbsenceDate(e.target.value)} max={todayISO}
              style={{ ...MF.select, padding: '12px 12px' }} />
            <div style={{ fontSize: 11, color: '#9da3b8', marginTop: 6 }}>اختر تاريخ يوم الغياب (أو آخر يوم إذا كان أكثر من يوم)</div>
          </div>
        </div>

        {/* Excuse text */}
        <div style={MF.card}>
          <div style={{ ...MF.cardAccent, background: themeColor }} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: themeColor }}>edit</span>
              سبب الغياب
            </div>
            <div style={{ fontSize: 12, color: '#5c6178', marginBottom: 12 }}>اكتب سبب غياب ابنك بالتفصيل</div>
            <textarea value={excuseText} onChange={(e) => setExcuseText(e.target.value)} maxLength={500}
              placeholder="مثال: كان يعاني من ارتفاع في درجة الحرارة ولم يتمكن من الحضور..."
              style={{ ...MF.textarea, minHeight: 140 }} />
            <div style={{ textAlign: 'left', fontSize: 11, color: '#9da3b8', marginTop: 6 }}>{excuseText.length} / 500</div>
          </div>
        </div>

        {/* Attachments */}
        <div style={{ ...MF.card, marginBottom: 90 }}>
          <div style={{ ...MF.cardAccent, background: themeColor }} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: themeColor }}>attach_file</span>
              المرفقات
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#f4f5f9', borderRadius: 8, marginTop: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0, color: '#5c6178' }}>info</span>
              <p style={{ fontSize: 12, color: '#374151', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                المرفقات (تقارير طبية، أعذار رسمية) تُسلّم ورقياً مع الطالب عند حضوره للمدرسة.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, cursor: 'pointer', marginTop: 10 }} onClick={() => setHasAttachment(!hasAttachment)}>
              <input type="checkbox" checked={hasAttachment} onChange={() => { /* handled by parent onClick */ }} style={{ width: 20, height: 20, accentColor: themeColor, cursor: 'pointer', flexShrink: 0 }} />
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>لدي مرفقات سيتم تسليمها مع ابني</label>
            </div>
          </div>
        </div>
      </div>

      {/* Submit area */}
      <div style={MF.bottomBar}>
        <button onClick={handleSubmit} disabled={submitting || excuseText.trim().length < 5}
          style={{
            ...MF.submitBtn,
            background: (submitting || excuseText.trim().length < 5) ? '#d1d5db' : themeColor,
            cursor: (submitting || excuseText.trim().length < 5) ? 'not-allowed' : 'pointer',
          }}>
          {submitting
            ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_empty</span> جاري الإرسال...</>
            : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span> إرسال العذر</>
          }
        </button>
      </div>
    </div>
  );
};

export default ParentExcusePublicPage;
