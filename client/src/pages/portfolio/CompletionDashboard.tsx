import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioApi, CompletionData, IndicatorData } from '../../api/portfolio';
import { toIndic } from '../../utils/printUtils';
import MI from '../../components/shared/MI';

/* ── guidance map: label → { page name, route, icon } ── */
const guidanceMap: Record<string, { label: string; route: string; icon: string }> = {
  'المخالفات السلوكية': { label: 'انتقل لصفحة المخالفات', route: '/violations', icon: 'gavel' },
  'سجلات الغياب': { label: 'انتقل لصفحة الغياب', route: '/absence', icon: 'event_busy' },
  'سجلات التأخر': { label: 'انتقل لصفحة التأخر', route: '/tardiness', icon: 'schedule' },
  'سجلات الاستئذان': { label: 'انتقل لصفحة الاستئذان', route: '/permissions', icon: 'exit_to_app' },
  'السلوك الإيجابي': { label: 'انتقل لصفحة السلوك الإيجابي', route: '/positive', icon: 'thumb_up' },
  'رسائل التواصل (≥١٠)': { label: 'انتقل لصفحة الواتساب', route: '/whatsapp', icon: 'chat' },
  'أعذار أولياء الأمور': { label: 'انتقل لصفحة الأعذار', route: '/parent-excuse', icon: 'assignment_late' },
  'رصد المخالفات': { label: 'انتقل لصفحة المخالفات', route: '/violations', icon: 'gavel' },
  'متابعة مؤشرات الخطر': { label: 'انتقل لصفحة المخالفات', route: '/violations', icon: 'warning' },
  'الملاحظات التربوية': { label: 'انتقل لصفحة الملاحظات', route: '/notes', icon: 'sticky_note_2' },
  'المتابعة السلوكية': { label: 'انتقل لصفحة المخالفات', route: '/violations', icon: 'gavel' },
};

function barColor(pct: number) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#f59e0b';
  return '#dc2626';
}

function statusNode(ind: IndicatorData) {
  if (ind.score === ind.total)
    return <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>مكتمل</span>;
  if (ind.score === 0)
    return <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>لم يبدأ</span>;
  const missing = ind.total - ind.score;
  return (
    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 12 }}>
      ناقص {toIndic(missing)}
    </span>
  );
}

const CompletionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CompletionData | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    portfolioApi.getCompletion()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>جاري تحميل بيانات الاكتمال...</div>;
  if (error || !data) return <div style={{ textAlign: 'center', padding: 16, color: '#f59e0b', fontSize: 13, background: '#FFF8E8', borderRadius: 8, marginBottom: 12 }}>⚠ لم يتم تحميل بيانات الاكتمال — تحقق من الاتصال</div>;

  const { summary, indicators } = data;
  const pct = summary.overallPercentage;

  return (
    <div style={{ direction: 'rtl', fontFamily: 'inherit' }}>
      {/* ── Overall Progress ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>جاهزية ملف الإنجاز</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: barColor(pct) }}>
            {toIndic(pct)}٪
          </span>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: '#e5e7eb', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 6,
              background: barColor(pct),
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>

      {/* ── Indicator Cards ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {indicators.map((ind) => {
          const isOpen = expanded === ind.id;
          return (
            <div
              key={ind.id}
              style={{
                flex: '1 1 200px',
                background: '#fff',
                borderRadius: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                padding: 16,
                borderRight: `4px solid ${ind.color}`,
                cursor: 'pointer',
                transition: 'box-shadow .2s',
              }}
              onClick={() => setExpanded(isOpen ? null : ind.id)}
            >
              {/* header */}
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{ind.name}</div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>{ind.code}</div>

              {/* circular progress */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: `3px solid ${ind.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                  fontWeight: 700,
                  fontSize: 15,
                  color: ind.color,
                }}
              >
                {toIndic(ind.score)}/{toIndic(ind.total)}
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                {toIndic(ind.percentage)}٪
              </div>
              <div style={{ textAlign: 'center' }}>{statusNode(ind)}</div>

              {/* ── Checklist Details ── */}
              {isOpen && (
                <div style={{ marginTop: 14, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>قائمة الإنجاز:</div>
                  {ind.details.map((d, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', marginBottom: 4,
                      background: d.exists ? '#f0fdf4' : '#fef2f2',
                      borderRadius: 8,
                      border: `1px solid ${d.exists ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: d.exists ? '#16a34a' : '#fff',
                          border: d.exists ? 'none' : '2px solid #d1d5db',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {d.exists && <MI n="check" s={16} c="#fff" />}
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: d.exists ? '#15803d' : '#991b1b',
                          textDecoration: d.exists ? 'line-through' : 'none',
                        }}>
                          {d.label}
                        </span>
                        {d.exists && (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ مكتمل</span>
                        )}
                      </div>

                      {!d.exists && guidanceMap[d.label] && (
                        <button
                          onClick={() => navigate(guidanceMap[d.label].route)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#1B3A6B', color: '#fff',
                            border: 'none', borderRadius: 8,
                            padding: '6px 14px', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'background .2s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#2E5FA3')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#1B3A6B')}
                        >
                          <MI n={guidanceMap[d.label].icon} s={16} c="#fff" />
                          {guidanceMap[d.label].label}
                          <MI n="arrow_back" s={14} c="#fff" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Stats ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'اللجان المكتملة', value: `${toIndic(summary.committeesReady)}/٣` },
          { label: 'اجتماعات اللجان', value: toIndic(summary.totalMeetings) },
          { label: 'شواهد جاهزة', value: toIndic(summary.readyEvidence) },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 140px',
              background: '#f9fafb',
              borderRadius: 10,
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletionDashboard;
