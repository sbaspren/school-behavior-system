import React, { useEffect, useState } from 'react';
import { portfolioApi, CompletionData, IndicatorData } from '../../api/portfolio';
import { toIndic } from '../../utils/printUtils';
import MI from '../../components/shared/MI';

/* ── guidance map ── */
const guidanceMap: Record<string, string> = {
  'المخالفات السلوكية': 'صفحة المخالفات',
  'سجلات الغياب': 'صفحة الغياب',
  'سجلات التأخر': 'صفحة التأخر',
  'سجلات الاستئذان': 'صفحة الاستئذان',
  'السلوك الإيجابي': 'صفحة السلوك الإيجابي',
  'رسائل التواصل': 'صفحة الواتساب',
  'الملاحظات التربوية': 'صفحة الملاحظات',
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
  const [data, setData] = useState<CompletionData | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    portfolioApi.getCompletion().then(setData).catch(console.error);
  }, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</div>;

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

              {/* ── Expandable Details ── */}
              {isOpen && (
                <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                  {ind.details.map((d, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        {d.exists ? (
                          <MI n="check_circle" s={18} c="#16a34a" />
                        ) : (
                          <MI n="cancel" s={18} c="#dc2626" />
                        )}
                        <span>{d.label}</span>
                      </div>
                      {!d.exists && guidanceMap[d.label] && (
                        <div
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 12,
                            marginTop: 4,
                            marginRight: 24,
                          }}
                        >
                          {'💡'} هذا الشاهد يحتاج تسجيل بيانات — ابدأ من {guidanceMap[d.label]}
                        </div>
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
