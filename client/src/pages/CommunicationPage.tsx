import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import FilterBtn from '../components/shared/FilterBtn';
import { communicationApi } from '../api/communication';
import { SETTINGS_STAGES } from '../utils/constants';
import { useAppContext } from '../hooks/useAppContext';
import { escapeHtml, toIndic, getTodayDates, classToLetter } from '../utils/printUtils';
import { printListReport, printSingleDetail, ListReportRow } from '../utils/printTemplates';

const MESSAGE_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  'واتساب': { label: 'واتساب', color: '#16a34a', bg: '#dcfce7' },
  'SMS': { label: 'SMS', color: '#2563eb', bg: '#dbeafe' },
  'إيميل': { label: 'إيميل', color: '#7c3aed', bg: '#f5f3ff' },
  'مخالفة': { label: 'مخالفة', color: '#dc2626', bg: '#fee2e2' },
  'ملاحظة': { label: 'ملاحظة', color: '#059669', bg: '#d1fae5' },
  'غياب': { label: 'غياب', color: '#ea580c', bg: '#ffedd5' },
  'تأخر': { label: 'تأخر', color: '#ca8a04', bg: '#fef9c3' },
};

const SEND_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  'تم': { label: 'تم الإرسال', color: '#16a34a', bg: '#dcfce7' },
  'sent': { label: 'تم الإرسال', color: '#16a34a', bg: '#dcfce7' },
  '✅ تم الإرسال': { label: 'تم الإرسال', color: '#16a34a', bg: '#dcfce7' },
  'فشل': { label: 'فشل', color: '#dc2626', bg: '#fee2e2' },
  'failed': { label: 'فشل', color: '#dc2626', bg: '#fee2e2' },
  '❌ فشل': { label: 'فشل', color: '#dc2626', bg: '#fee2e2' },
  'جاري الإرسال': { label: 'جاري الإرسال', color: '#ca8a04', bg: '#fef9c3' },
};

interface CommRow {
  id: number;
  studentId: number;
  studentNumber: string;
  studentName: string;
  grade: string;
  className: string;
  stage: string;
  mobile: string;
  messageType: string;
  messageTitle: string;
  messageBody: string;
  sendStatus: string;
  sentBy: string;
  hijriDate: string;
  miladiDate: string;
  time: string;
  notes: string;
}

interface SummaryData {
  total: number;
  sent: number;
  failed: number;
  todayCount: number;
  weekCount: number;
  byType: { type: string; count: number }[];
}

const CommunicationPage: React.FC = () => {
  const { stages, enabledStages, schoolSettings } = useAppContext();
  const [records, setRecords] = useState<CommRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('__all__');
  const [typeFilter, setTypeFilter] = useState('__all__');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CommRow | null>(null);

  const initialLoadDone = useRef(false);
  const loadData = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const stg = stageFilter !== '__all__' ? stageFilter : undefined;
      const [rRes, sumRes] = await Promise.all([
        communicationApi.getAll({ stage: stg }),
        communicationApi.getSummary(stg),
      ]);
      if (rRes.data?.data) setRecords(rRes.data.data);
      if (sumRes.data?.data) setSummary(sumRes.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); initialLoadDone.current = true; }
  }, [stageFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = records;
    if (typeFilter !== '__all__') list = list.filter(r => r.messageType === typeFilter);
    if (statusFilter !== '__all__') list = list.filter(r => r.sendStatus === statusFilter);
    if (dateFrom) list = list.filter(r => r.miladiDate >= dateFrom.replace(/-/g, '/'));
    if (dateTo) list = list.filter(r => r.miladiDate <= dateTo.replace(/-/g, '/'));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q) || r.mobile.includes(q));
    }
    return list;
  }, [records, typeFilter, statusFilter, dateFrom, dateTo, search]);

  const stageLabel = (id: string) => SETTINGS_STAGES.find(s => s.id === id)?.name || id;

  const clearFilters = () => {
    setTypeFilter('__all__');
    setStatusFilter('__all__');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل تريد حذف هذا السجل؟')) return;
    try {
      await communicationApi.delete(id);
      toast.success('تم الحذف');
      loadData();
    } catch { toast.error('فشل الحذف'); }
  };

  const handleResend = async (rec: CommRow) => {
    if (!window.confirm(`هل تريد إعادة إرسال الرسالة إلى ولي أمر ${rec.studentName}؟`)) return;
    toast('جاري إعادة الإرسال...');
    try {
      await communicationApi.log({
        stage: rec.stage,
        studentId: rec.studentId,
        studentNumber: rec.studentNumber,
        studentName: rec.studentName,
        grade: rec.grade,
        className: rec.className,
        phone: rec.mobile,
        messageType: rec.messageType,
        messageTitle: (rec.messageTitle || '') + ' (إعادة إرسال)',
        messageContent: rec.messageBody,
        sender: rec.sentBy,
      });
      toast.success('تم إعادة الإرسال');
      loadData();
    } catch { toast.error('فشل إعادة الإرسال'); }
  };

  const handlePrint = () => {
    if (filtered.length === 0) { toast.error('لا توجد بيانات للطباعة'); return; }
    const { hijri } = getTodayDates();
    const stgName = stageFilter !== '__all__' ? stageLabel(stageFilter) : '';

    const rows: ListReportRow[] = filtered.map((rec, i) => {
      const statusColor = (rec.sendStatus || '').includes('تم') ? 'green' : '#999';
      const statusText = (rec.sendStatus || '').includes('تم') ? '&#10003;' : '&#10007;';
      return { cells: [
        toIndic(i + 1),
        escapeHtml(rec.hijriDate),
        `<span style="font-weight:bold;text-align:right">${escapeHtml(rec.studentName)}</span>`,
        `${escapeHtml(rec.grade)}/${escapeHtml(classToLetter(rec.className))}`,
        `<span style="direction:ltr;font-size:11pt">${escapeHtml(rec.mobile)}</span>`,
        escapeHtml(rec.messageType),
        `<span style="color:${statusColor};font-weight:bold">${statusText}</span>`,
      ] };
    });

    printListReport({
      title: 'سجل التواصل مع أولياء الأمور' + (stgName ? ' — ' + stgName : ''),
      dateText: `${hijri} | عدد الرسائل: ${toIndic(filtered.length)}`,
      headers: [
        { label: 'م', width: '5%' }, { label: 'التاريخ', width: '12%' }, { label: 'اسم الطالب', width: '24%' },
        { label: 'الصف', width: '10%' }, { label: 'الجوال', width: '14%' }, { label: 'النوع', width: '18%' }, { label: 'الحالة', width: '7%' },
      ],
      rows,
      summary: `المجموع: ${toIndic(filtered.length)} رسالة`,
    }, schoolSettings as any);
  };

  const handlePrintSingle = (rec: CommRow) => {
    const { hijri } = getTodayDates();
    printSingleDetail({
      title: 'إشعار تواصل مع ولي الأمر',
      dateText: hijri,
      fields: [
        { label: 'اسم الطالب:', value: rec.studentName },
        { label: 'الصف:', value: `${rec.grade} / ${classToLetter(rec.className)}` },
        { label: 'رقم الجوال:', value: rec.mobile, ltr: true },
        { label: 'تاريخ الإرسال:', value: `${rec.hijriDate} - ${rec.time}` },
        { label: 'نوع الرسالة:', value: rec.messageType },
        { label: 'حالة الإرسال:', value: rec.sendStatus },
      ],
      messageTitle: 'نص الرسالة:',
      messageBody: rec.messageBody,
    }, schoolSettings as any);
  };

  const handleExport = async () => {
    toast('جاري تصدير البيانات...');
    try {
      const stg = stageFilter !== '__all__' ? stageFilter : undefined;
      const res = await communicationApi.export({
        stage: stg,
        messageType: typeFilter !== '__all__' ? typeFilter : undefined,
        status: statusFilter !== '__all__' ? statusFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const data = res.data?.data;
      if (!data || data.length === 0) { toast.error('لا توجد بيانات للتصدير'); return; }

      const headers = ['التاريخ', 'الوقت', 'الطالب', 'الصف', 'الجوال', 'النوع', 'العنوان', 'الرسالة', 'الحالة', 'المرسل'];
      const csvRows = [headers.join(',')];
      data.forEach((r: any) => {
        csvRows.push([
          r.hijriDate, r.time, r.studentName, r.gradeClass,
          r.mobile, r.messageType, `"${(r.messageTitle || '').replace(/"/g, '""')}"`,
          `"${(r.messageBody || '').replace(/"/g, '""')}"`, r.sendStatus, r.sentBy,
        ].join(','));
      });
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_التواصل_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم التصدير');
    } catch { toast.error('فشل التصدير'); }
  };

  return (
    <div>
      {/* ★ Header — مطابق لتصميم v22 مع أيقونة وعنوان فرعي */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#4f46e5' }}>schedule_send</span>
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: 0 }}>سجل التواصل</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>توثيق جميع الرسائل المرسلة لأولياء الأمور</p>
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="إجمالي الرسائل" value={summary.total} color="#374151" />
          <StatCard label="تم الإرسال" value={summary.sent} color="#16a34a" />
          <StatCard label="فشل" value={summary.failed} color="#dc2626" />
          <StatCard label="اليوم" value={summary.todayCount} color="#2563eb" />
          <StatCard label="هذا الأسبوع" value={summary.weekCount} color="#7c3aed" />
        </div>
      )}

      {/* By Type breakdown */}
      {summary && summary.byType && summary.byType.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>توزيع الرسائل حسب النوع</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {summary.byType.map((item) => {
              const mt = MESSAGE_TYPES[item.type] || { label: item.type, color: '#374151', bg: '#f3f4f6' };
              return (
                <div key={item.type} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: mt.bg, borderRadius: '100px', padding: '6px 14px',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: mt.color }}>{mt.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: mt.color }}>{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterBtn label="الكل" active={stageFilter === '__all__'} onClick={() => setStageFilter('__all__')} color="#4f46e5" />
        {enabledStages.map(s => (
          <FilterBtn key={s.stage} label={stageLabel(s.stage)} active={stageFilter === s.stage} onClick={() => setStageFilter(s.stage)} color="#4f46e5" />
        ))}
      </div>

      {/* Filters bar */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="__all__">كل الأنواع</option>
            <option value="مخالفة">مخالفة سلوكية</option>
            <option value="ملاحظة">ملاحظة تربوية</option>
            <option value="غياب">غياب</option>
            <option value="تأخر">تأخر</option>
            <option value="واتساب">واتساب</option>
            <option value="SMS">SMS</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="__all__">كل الحالات</option>
            <option value="تم">تم الإرسال</option>
            <option value="فشل">فشل</option>
            <option value="جاري الإرسال">جاري الإرسال</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={selectStyle} placeholder="من تاريخ" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={selectStyle} placeholder="إلى تاريخ" />
          <input type="text" placeholder="بحث بالاسم أو الجوال..." value={search} onChange={e => setSearch(e.target.value)} style={selectStyle} />
          <button onClick={clearFilters} style={{
            padding: '8px 16px', background: '#f3f4f6', color: '#6b7280', border: '2px solid #d1d5db',
            borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
          }}>مسح الفلاتر</button>
        </div>
        {/* ★ أزرار الإجراءات — مطابق لـ v22 (تحت الفلاتر مع أيقونات) */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button onClick={loadData} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
            background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span> تحديث السجل
          </button>
          <button onClick={handlePrint} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
            background: '#f5f3ff', color: '#7c3aed', border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span> طباعة
          </button>
          <button onClick={handleExport} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
            background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span> تصدير Excel
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: '#9ca3af' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>mark_email_read</span>
          <p style={{ fontSize: '16px', fontWeight: 500 }}>لا توجد رسائل مسجلة</p>
          <p style={{ fontSize: '13px' }}>سيتم تسجيل الرسائل هنا عند إرسالها من الأقسام الأخرى</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#4f46e5', borderBottom: '2px solid #3730a3' }}>
                <th style={thStylePurple}>#</th>
                <th style={thStylePurple}>التاريخ</th>
                <th style={thStylePurple}>الطالب</th>
                <th style={thStylePurple}>الصف</th>
                <th style={thStylePurple}>النوع</th>
                <th style={thStylePurple}>العنوان</th>
                <th style={thStylePurple}>الحالة</th>
                <th style={{ ...thStylePurple, textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const mt = MESSAGE_TYPES[r.messageType] || { label: r.messageType, color: '#374151', bg: '#f3f4f6' };
                const ss = SEND_STATUS[r.sendStatus] || { label: r.sendStatus, color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>
                      <div>{r.hijriDate || r.miladiDate || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{r.time}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', direction: 'ltr' as const }}>{r.mobile}</div>
                    </td>
                    <td style={tdStyle}>{r.grade} / {classToLetter(r.className)}</td>
                    <td style={tdStyle}>
                      <span style={{ background: mt.bg, color: mt.color, padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{mt.label}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={r.messageTitle || r.messageBody?.substring(0, 80)}>
                      {r.messageTitle || r.messageBody?.substring(0, 40) || '-'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: ss.bg, color: ss.color, padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{ss.label}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setSelectedRecord(r)} title="عرض التفاصيل" style={actionBtnStyle('#2563eb', '#dbeafe')}><span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>visibility</span></button>
                      <button onClick={() => handleResend(r)} title="إعادة الإرسال" style={actionBtnStyle('#16a34a', '#dcfce7')}>↻</button>
                      <button onClick={() => handleDelete(r.id)} title="حذف" style={actionBtnStyle('#dc2626', '#fee2e2')}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedRecord && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={() => setSelectedRecord(null)}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)', padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderRadius: '20px 20px 0 0',
            }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: 0 }}>تفاصيل الرسالة</h3>
              <button onClick={() => setSelectedRecord(null)} style={{
                background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer',
              }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <InfoBox label="الطالب" value={selectedRecord.studentName} />
                <InfoBox label="الصف" value={`${selectedRecord.grade} / ${classToLetter(selectedRecord.className)}`} />
                <InfoBox label="التاريخ والوقت" value={`${selectedRecord.hijriDate} - ${selectedRecord.time}`} />
                <InfoBox label="رقم الجوال" value={selectedRecord.mobile} dir="ltr" />
                <InfoBox label="نوع الرسالة" value={selectedRecord.messageType} />
                <InfoBox label="حالة الإرسال" value={selectedRecord.sendStatus}
                  valueColor={(selectedRecord.sendStatus || '').includes('تم') ? '#16a34a' : '#dc2626'} />
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>نص الرسالة</div>
                <div style={{
                  fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px',
                }}>{selectedRecord.messageBody || '-'}</div>
              </div>
              {selectedRecord.sentBy && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                  المرسل: {selectedRecord.sentBy}
                </div>
              )}
            </div>
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #e5e7eb',
              display: 'flex', gap: '8px', justifyContent: 'flex-end',
            }}>
              <button onClick={() => handlePrintSingle(selectedRecord)} style={toolBtnStyle('#7c3aed', '#f5f3ff')}>طباعة</button>
              <button onClick={() => { handleResend(selectedRecord); setSelectedRecord(null); }} style={toolBtnStyle('#16a34a', '#dcfce7')}>إعادة إرسال</button>
              <button onClick={() => setSelectedRecord(null)} style={{
                padding: '8px 20px', background: '#4b5563', color: '#fff', border: 'none',
                borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
              }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Sub-components =====

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb' }}>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
  </div>
);

const InfoBox: React.FC<{ label: string; value: string; dir?: string; valueColor?: string }> = ({ label, value, dir, valueColor }) => (
  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
    <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
    <div style={{
      fontWeight: 700, color: valueColor || '#111', fontSize: '14px',
      direction: dir as any,
    }}>{value || '-'}</div>
  </div>
);

// ===== Helpers =====

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '13px',
};
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#374151' };
const thStylePurple: React.CSSProperties = { padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#fff' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'right' };
const toolBtnStyle = (color: string, bg: string): React.CSSProperties => ({
  padding: '8px 16px', background: bg, color, border: 'none', borderRadius: '12px',
  fontWeight: 700, fontSize: '13px', cursor: 'pointer',
});
const actionBtnStyle = (color: string, bg: string): React.CSSProperties => ({
  width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: bg,
  color, cursor: 'pointer', fontSize: '14px', marginInline: '2px',
});

export default CommunicationPage;
