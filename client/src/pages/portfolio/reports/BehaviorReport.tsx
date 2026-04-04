import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { positiveBehaviorApi } from '../../../api/positiveBehavior';
import { useAppContext } from '../../../hooks/useAppContext';
import { SETTINGS_STAGES } from '../../../utils/constants';
import { toIndic, classToLetter } from '../../../utils/printUtils';
import MI from '../../../components/shared/MI';
import FilterBtn from '../../../components/shared/FilterBtn';
import type { BehaviorRow } from '../../../types';

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };

const BehaviorReport: React.FC = () => {
  const { enabledStages } = useAppContext();
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('__all__');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage !== '__all__' ? stage : undefined;
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
    const w = window.open('', '_blank');
    if (!w) return;
    const trs = topStudents.map((s, i) =>
      `<tr><td>${toIndic(i + 1)}</td><td>${s.name}</td><td>${s.grade} / ${classToLetter(s.cls)}</td><td>${toIndic(s.count)}</td></tr>`
    ).join('');
    w.document.write(`<html dir="rtl"><head><title>تقرير السلوك الإيجابي</title></head><body style="font-family:Cairo,sans-serif;padding:20px">
      <h2>تقرير السلوك الإيجابي</h2><p>الإجمالي: ${toIndic(total)}</p>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>العدد</th></tr>${trs}</table>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          <FilterBtn label="الكل" active={stage === '__all__'} onClick={() => setStage('__all__')} color="#1B3A6B" />
          {enabledStages.map(s => {
            const lbl = SETTINGS_STAGES.find(ss => ss.id === s.stage)?.name || s.stage;
            return <FilterBtn key={s.stage} label={lbl} active={stage === s.stage} onClick={() => setStage(s.stage)} color="#1B3A6B" />;
          })}
        </div>
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
