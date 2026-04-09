import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { permissionsApi } from '../../../api/permissions';
import { useAppContext } from '../../../hooks/useAppContext';
import { toIndic, classToLetter } from '../../../utils/printUtils';
import { printPortfolioReport } from '../../../utils/print/portfolio';
import MI from '../../../components/shared/MI';
import type { PermissionRow } from '../../../types';

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const inputS: React.CSSProperties = { padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' };

const PermissionsReport: React.FC = () => {
  const { activeStage: stage, schoolSettings } = useAppContext();
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage || undefined;
      const res = await permissionsApi.getAll({ stage: s, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setRows(res.data?.data || res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.length;

  // By reason
  const byReason = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const reason = r.reason || 'غير محدد';
      map.set(reason, (map.get(reason) || 0) + 1);
    });
    return Array.from(map.entries()).map(([r, c]) => ({ reason: r, count: c })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const maxReason = Math.max(1, ...byReason.map(r => r.count));

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

  // Monthly
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const d = r.hijriDate || r.recordedAt || '';
      const month = d.substring(0, 7) || 'غير محدد';
      map.set(month, (map.get(month) || 0) + 1);
    });
    return Array.from(map.entries()).map(([m, c]) => ({ month: m, count: c })).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  const handlePrint = () => {
    printPortfolioReport({
      title: 'تقرير الاستئذان',
      subtitle: 'ملف إنجاز وكيل شؤون الطلاب',
      summaryItems: [
        { label: 'إجمالي الاستئذان', value: toIndic(total), color: '#8b5cf6' },
      ],
      tableHeaders: ['م', 'اسم الطالب', 'الفصل', 'عدد مرات الاستئذان'],
      tableRows: topStudents.map((s, i) => [
        toIndic(i + 1), s.name, `${s.grade} / ${classToLetter(s.cls)}`, toIndic(s.count),
      ]),
      settings: schoolSettings,
      extraHtml: byReason.length ? `
        <h2 class="h2" style="margin-top:14pt;">التوزيع حسب السبب</h2>
        <table><thead><tr><th style="text-align:center;width:18pt;">م</th><th>السبب</th><th style="text-align:center;">العدد</th></tr></thead>
        <tbody>${byReason.slice(0, 8).map((r, i) => `<tr><td class="num">${toIndic(i + 1)}</td><td>${r.reason}</td><td class="cnt">${toIndic(r.count)}</td></tr>`).join('')}</tbody></table>
      ` : '',
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputS} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputS} />
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MI n="print" s={16} c="#fff" /> طباعة
        </button>
      </div>

      {/* Stat card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#8b5cf618', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MI n="exit_to_app" s={22} c="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>إجمالي الاستئذان</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>{toIndic(total)}</div>
          </div>
        </div>
      </div>

      {/* By reason bars */}
      {byReason.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب السبب</h3>
          {byReason.slice(0, 8).map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{r.reason}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(r.count)}</span>
              </div>
              <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(r.count / maxReason) * 100}%`, background: `hsl(${260 + i * 20}, 60%, 55%)`, borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top students */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>أكثر الطلاب استئذاناً (أعلى {toIndic(10)})</h3>
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

export default PermissionsReport;
