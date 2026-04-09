import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { positiveBehaviorApi } from '../../../api/positiveBehavior';
import { useAppContext } from '../../../hooks/useAppContext';
import { toIndic, classToLetter } from '../../../utils/printUtils';
import { printPortfolioReport } from '../../../utils/print/portfolio';
import MI from '../../../components/shared/MI';
import type { BehaviorRow } from '../../../types';

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };

const BehaviorReport: React.FC = () => {
  const { activeStage: stage, schoolSettings } = useAppContext();
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage || undefined;
      const res = await positiveBehaviorApi.getAll({ stage: s });
      setRows(res.data?.data || res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.length;

  // By type
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const t = r.behaviorType || 'غير محدد';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([t, c]) => ({ type: t, count: c })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const maxType = Math.max(1, ...byType.map(t => t.count));

  // Top students
  const topStudents = useMemo(() => {
    const map = new Map<number, { name: string; grade: string; cls: string; count: number }>();
    rows.forEach(r => {
      const cur = map.get(r.studentId) || { name: r.studentName, grade: r.grade, cls: r.className, count: 0 };
      cur.count++;
      map.set(r.studentId, cur);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ studentId: id, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [rows]);

  const handlePrint = () => {
    printPortfolioReport({
      title: 'تقرير السلوك الإيجابي',
      subtitle: 'ملف إنجاز وكيل شؤون الطلاب',
      summaryItems: [
        { label: 'إجمالي السلوك الإيجابي', value: toIndic(total), color: '#22c55e' },
      ],
      tableHeaders: ['م', 'اسم الطالب', 'الفصل', 'عدد السلوكيات الإيجابية'],
      tableRows: topStudents.map((s, i) => [
        toIndic(i + 1), s.name, `${s.grade} / ${classToLetter(s.cls)}`, toIndic(s.count),
      ]),
      settings: schoolSettings,
      extraHtml: byType.length ? `
        <h2 class="h2" style="margin-top:14pt;">التوزيع حسب النوع</h2>
        <table><thead><tr><th style="text-align:center;width:18pt;">م</th><th>النوع</th><th style="text-align:center;">العدد</th></tr></thead>
        <tbody>${byType.slice(0, 10).map((t, i) => `<tr><td class="num">${toIndic(i + 1)}</td><td>${t.type}</td><td class="cnt">${toIndic(t.count)}</td></tr>`).join('')}</tbody></table>
      ` : '',
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MI n="print" s={16} c="#fff" /> طباعة
        </button>
      </div>

      {/* Stat card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#22c55e18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MI n="thumb_up" s={22} c="#22c55e" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>إجمالي السلوك الإيجابي</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{toIndic(total)}</div>
          </div>
        </div>
      </div>

      {/* By type bars */}
      {byType.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب النوع</h3>
          {byType.slice(0, 10).map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{t.type}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(t.count)}</span>
              </div>
              <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(t.count / maxType) * 100}%`, background: `hsl(${140 + i * 15}, 55%, 45%)`, borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top students */}
      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>أكثر الطلاب تميزاً (أعلى {toIndic(10)})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thS}>#</th><th style={thS}>اسم الطالب</th><th style={thS}>الفصل</th><th style={thS}>العدد</th></tr></thead>
            <tbody>
              {topStudents.map((s, i) => (
                <tr key={s.studentId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={tdS}>{toIndic(i + 1)}</td>
                  <td style={tdS}>{s.name}</td>
                  <td style={tdS}>{s.grade} / {classToLetter(s.cls)}</td>
                  <td style={tdS}>{toIndic(s.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BehaviorReport;
