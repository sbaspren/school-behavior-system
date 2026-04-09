import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { tardinessApi } from '../../../api/tardiness';
import { useAppContext } from '../../../hooks/useAppContext';
import { SETTINGS_STAGES } from '../../../utils/constants';
import { toIndic, classToLetter, tardinessTypeLabel } from '../../../utils/printUtils';
import { printPortfolioReport } from '../../../utils/print/portfolio';
import MI from '../../../components/shared/MI';
import FilterBtn from '../../../components/shared/FilterBtn';
import type { TardinessRow } from '../../../types';

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const inputS: React.CSSProperties = { padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' };

const TYPE_COLORS: Record<string, string> = { 'Morning': '#f59e0b', 'Period': '#6366f1', 'Assembly': '#0ea5e9' };

const TardinessReport: React.FC = () => {
  const { enabledStages, schoolSettings } = useAppContext();
  const [rows, setRows] = useState<TardinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage !== '__all__' ? stage : undefined;
      const res = await tardinessApi.getAll({ stage: s, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setRows(res.data?.data || res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.length;

  // By type
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const t = r.tardinessType || 'Morning';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([t, c]) => ({ type: t, count: c }));
  }, [rows]);

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

  // Monthly breakdown
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const d = r.hijriDate || r.recordedAt || '';
      const month = d.substring(0, 7) || 'غير محدد';
      map.set(month, (map.get(month) || 0) + 1);
    });
    return Array.from(map.entries()).map(([m, c]) => ({ month: m, count: c })).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  const maxType = Math.max(1, ...byType.map(t => t.count));

  const handlePrint = () => {
    const typesSummary = byType.map(t => ({
      label: tardinessTypeLabel(t.type), value: toIndic(t.count), color: TYPE_COLORS[t.type] || '#6366f1',
    }));
    printPortfolioReport({
      title: 'تقرير التأخر',
      subtitle: 'ملف إنجاز وكيل شؤون الطلاب',
      summaryItems: [
        { label: 'إجمالي التأخر', value: toIndic(total), color: '#f59e0b' },
        ...typesSummary,
      ],
      tableHeaders: ['م', 'اسم الطالب', 'الفصل', 'عدد مرات التأخر'],
      tableRows: topStudents.map((s, i) => [
        toIndic(i + 1), s.name, `${s.grade} / ${classToLetter(s.cls)}`, toIndic(s.count),
      ]),
      settings: schoolSettings,
    });
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
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputS} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputS} />
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MI n="print" s={16} c="#fff" /> طباعة
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f59e0b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MI n="schedule" s={22} c="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>إجمالي التأخر</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{toIndic(total)}</div>
          </div>
        </div>
        {byType.map((t, i) => (
          <div key={i} style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: (TYPE_COLORS[t.type] || '#6366f1') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MI n="schedule" s={22} c={TYPE_COLORS[t.type] || '#6366f1'} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{tardinessTypeLabel(t.type)}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: TYPE_COLORS[t.type] || '#6366f1' }}>{toIndic(t.count)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* By type bars */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب النوع</h3>
        {byType.map((t, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{tardinessTypeLabel(t.type)}</span>
              <span style={{ color: '#6b7280' }}>{toIndic(t.count)}</span>
            </div>
            <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(t.count / maxType) * 100}%`, background: TYPE_COLORS[t.type] || '#6366f1', borderRadius: 6, transition: 'width 0.4s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Top students table */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>أكثر الطلاب تأخراً (أعلى {toIndic(10)})</h3>
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

      {/* Monthly */}
      {monthly.length > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع الشهري</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thS}>الشهر</th><th style={thS}>العدد</th></tr></thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={tdS}>{m.month}</td>
                    <td style={tdS}>{toIndic(m.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TardinessReport;
