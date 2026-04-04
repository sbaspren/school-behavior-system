import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { violationsApi } from '../../../api/violations';
import { useAppContext } from '../../../hooks/useAppContext';
import { SETTINGS_STAGES, DEGREE_LABELS as DEGREE_LABELS_OBJ } from '../../../utils/constants';
import { toIndic, classToLetter } from '../../../utils/printUtils';
import MI from '../../../components/shared/MI';
import FilterBtn from '../../../components/shared/FilterBtn';

const DEGREE_COLORS: Record<number, string> = Object.fromEntries(
  Object.entries(DEGREE_LABELS_OBJ).map(([k, v]) => [Number(k), v.color])
);
const DEGREE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(DEGREE_LABELS_OBJ).map(([k, v]) => [Number(k), v.label])
);

interface ReportData {
  total: number;
  totalDeduction: number;
  topStudents: { studentId: number; studentName: string; grade: string; className: string; count: number; totalDeduction: number; behaviorScore: number }[];
  byClass: { grade: string; className: string; count: number }[];
  byDegree: { degree: number; count: number; deduction: number }[];
  byDate: { date: string; count: number }[];
  byDescription: { description: string; count: number }[];
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const inputS: React.CSSProperties = { padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' };

const ViolationsReport: React.FC = () => {
  const { enabledStages } = useAppContext();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('__all__');
  const [gradeFilter, setGradeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage !== '__all__' ? stage : undefined;
      const res = await violationsApi.getReport(s, gradeFilter || undefined, undefined, dateFrom || undefined, dateTo || undefined);
      if (res.data?.data) setData(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage, gradeFilter, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const uniqueStudents = data?.topStudents?.length || 0;
  const highRisk = useMemo(() => data?.byDegree?.filter(d => d.degree >= 4).reduce((s, d) => s + d.count, 0) || 0, [data]);
  const maxDeg = useMemo(() => Math.max(1, ...(data?.byDegree?.map(d => d.count) || [1])), [data]);
  const maxCls = useMemo(() => Math.max(1, ...(data?.byClass?.slice(0, 10).map(c => c.count) || [1])), [data]);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = data?.topStudents?.slice(0, 10).map((s, i) =>
      `<tr><td>${toIndic(i + 1)}</td><td>${s.studentName}</td><td>${s.grade} / ${classToLetter(s.className)}</td><td>${toIndic(s.count)}</td><td>${toIndic(s.totalDeduction)}</td></tr>`
    ).join('') || '';
    w.document.write(`<html dir="rtl"><head><title>تقرير المخالفات</title></head><body style="font-family:Cairo,sans-serif;padding:20px">
      <h2>تقرير المخالفات</h2>
      <p>الإجمالي: ${toIndic(data?.total || 0)} | الحسم: ${toIndic(data?.totalDeduction || 0)} | طلاب: ${toIndic(uniqueStudents)}</p>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>العدد</th><th>الحسم</th></tr>${rows}</table>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>لا توجد بيانات</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          <FilterBtn label="الكل" active={stage === '__all__'} onClick={() => { setStage('__all__'); setGradeFilter(''); }} color="#1B3A6B" />
          {enabledStages.map(s => {
            const lbl = SETTINGS_STAGES.find(ss => ss.id === s.stage)?.name || s.stage;
            return <FilterBtn key={s.stage} label={lbl} active={stage === s.stage} onClick={() => { setStage(s.stage); setGradeFilter(''); }} color="#1B3A6B" />;
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
        {[
          { label: 'إجمالي المخالفات', value: data.total, color: '#6366f1', icon: 'gavel' },
          { label: 'إجمالي الحسم', value: data.totalDeduction, color: '#f59e0b', icon: 'remove_circle' },
          { label: 'طلاب مخالفون', value: uniqueStudents, color: '#0ea5e9', icon: 'group' },
          { label: 'مخالفات عالية', value: highRisk, color: '#ef4444', icon: 'warning' },
        ].map((c, i) => (
          <div key={i} style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MI n={c.icon} s={22} c={c.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{toIndic(c.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, marginBottom: 20 }}>
        {/* By degree */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>توزيع حسب الدرجة</h3>
          {data.byDegree.map(d => (
            <div key={d.degree} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>الدرجة {DEGREE_NAMES[d.degree] || toIndic(d.degree)}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(d.count)}</span>
              </div>
              <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(d.count / maxDeg) * 100}%`, background: DEGREE_COLORS[d.degree] || '#6366f1', borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* By class */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>حسب الفصل (أعلى {toIndic(10)})</h3>
          {data.byClass.slice(0, 10).map((c, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{c.grade} / {classToLetter(c.className)}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(c.count)}</span>
              </div>
              <div style={{ height: 20, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(c.count / maxCls) * 100}%`, background: `hsl(${220 + i * 15}, 65%, 50%)`, borderRadius: 5, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top students table */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>أكثر الطلاب مخالفات (أعلى {toIndic(10)})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>#</th>
                <th style={thS}>اسم الطالب</th>
                <th style={thS}>الفصل</th>
                <th style={thS}>عدد المخالفات</th>
                <th style={thS}>الحسم</th>
                <th style={thS}>درجة السلوك</th>
              </tr>
            </thead>
            <tbody>
              {data.topStudents.slice(0, 10).map((s, i) => (
                <tr key={s.studentId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={tdS}>{toIndic(i + 1)}</td>
                  <td style={tdS}>{s.studentName}</td>
                  <td style={tdS}>{s.grade} / {classToLetter(s.className)}</td>
                  <td style={tdS}>{toIndic(s.count)}</td>
                  <td style={tdS}>{toIndic(s.totalDeduction)}</td>
                  <td style={tdS}>{toIndic(s.behaviorScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By date table */}
      {data.byDate && data.byDate.length > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب التاريخ</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thS}>التاريخ</th><th style={thS}>العدد</th></tr></thead>
              <tbody>
                {data.byDate.map((d, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={tdS}>{d.date}</td>
                    <td style={tdS}>{toIndic(d.count)}</td>
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

export default ViolationsReport;
