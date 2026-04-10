import React, { useState, useMemo, useEffect } from 'react';
import MI from '../components/shared/MI';
import PageHero from '../components/shared/PageHero';
import TabBar from '../components/shared/TabBar';
import ActionBar from '../components/shared/ActionBar';
import FloatingBar from '../components/shared/FloatingBar';
import EmptyState from '../components/shared/EmptyState';
import ActionIcon from '../components/shared/ActionIcon';
import InputModal from '../components/shared/InputModal';
import StudentSelector from '../components/shared/StudentSelector';
import FilterBtn from '../components/shared/FilterBtn';
import HijriDatePicker from '../components/shared/HijriDatePicker';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { tardinessApi, TardinessData } from '../api/tardiness';
import { showSuccess, showError } from '../components/shared/Toast';
import { SETTINGS_STAGES, TARDINESS_TYPES, PERIODS, SECTION_THEMES, sortGrades, sortClasses, btnOutline } from '../utils/constants';
import { StageConfigData } from '../api/settings';
import { printForm, printListReport, ListReportRow } from '../utils/printTemplates';
import { printDailyReport } from '../utils/printDaily';
import { toIndic, escapeHtml, classToLetter } from '../utils/printUtils';
import SendMessageModal from '../components/shared/SendMessageModal';
import { usePageData, getHijriDate } from '../hooks/usePageData';
import type { TardinessRow, StudentOption } from '../types';

type TabType = 'today' | 'approved';

// ============================== Main Page ==============================
const TardinessPage: React.FC = () => {
  const {
    records, setRecords, stages, loading, schoolSettings,
    stageFilter, setStageFilter, enabledStages,
    filteredByStage, todayRecords, refresh,
  } = usePageData<TardinessRow>({ fetchRecords: (stage) => tardinessApi.getAll(stage ? { stage } : undefined) });

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [modalOpen, setModalOpen] = useState(false);

  // ★ عنوان ديناميكي مطابق: "التأخر — المرحلة المتوسطة"
  const stageInfo = SETTINGS_STAGES.find(s => s.id === stageFilter);
  const heroTitle = stageInfo ? `التأخر — ${stageInfo.name}` : 'التأخر';
  // ★ إحصائية "لم تُرسل" بدل "تم الإرسال"
  const unsentCount = filteredByStage.filter((r) => !r.isSent).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="sec-tardiness">
      <PageHero title={heroTitle} subtitle={getHijriDate()} gradient="linear-gradient(135deg, #dc2626, #ef4444)"
        accentColor="#dc2626" variant="outlined"
        stats={[
          { icon: 'schedule', label: 'متأخرو اليوم', value: todayRecords.length, color: '#fbbf24' },
          { icon: 'bar_chart', label: 'إجمالي التأخر', value: filteredByStage.length, color: '#c084fc' },
          { icon: 'send', label: 'لم تُرسل', value: unsentCount, color: '#60a5fa' },
        ]}
      />
      <TabBar tabs={[{ id: 'today', label: 'اليومي', icon: 'today' }, { id: 'approved', label: 'المعتمد', icon: 'verified' }]}
        activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabType)} sectionColor="#dc2626" />

      {activeTab === 'today' && <TodayTab records={todayRecords} allRecords={filteredByStage} onRefresh={refresh} stageFilter={stageFilter} schoolSettings={schoolSettings} onAdd={() => setModalOpen(true)} />}
      {activeTab === 'approved' && <ApprovedTab records={filteredByStage} onRefresh={refresh} schoolSettings={schoolSettings} stageFilter={stageFilter} />}
      {modalOpen && <AddTardinessModal stages={enabledStages} stageFilter={stageFilter} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); refresh(); }} />}
    </div>
  );
};

// ============================== Today Tab ==============================
const TodayTab: React.FC<{ records: TardinessRow[]; allRecords: TardinessRow[]; onRefresh: () => void; stageFilter: string; schoolSettings: Record<string, string>; onAdd: () => void }> = ({ records, allRecords, onRefresh, stageFilter, schoolSettings, onAdd }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<TardinessRow | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [msgEditorRow, setMsgEditorRow] = useState<TardinessRow | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const filtered = useMemo(() => {
    let list = records;
    if (typeFilter) list = list.filter((r) => r.tardinessType === typeFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    return list;
  }, [records, typeFilter, search]);

  const toggleSelect = (id: number) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((r) => r.id))); };
  const handleDelete = async () => { if (!confirmDelete) return; try { await tardinessApi.delete(confirmDelete.id); showSuccess('تم حذف السجل'); setConfirmDelete(null); onRefresh(); } catch { showError('خطأ'); } };
  const handleSendWhatsApp = (r: TardinessRow) => setMsgEditorRow(r);
  const handleConfirmSend = async (r: TardinessRow, message: string) => { setSendingId(r.id); setMsgEditorRow(null); try { const res = await tardinessApi.sendWhatsApp(r.id, { message }); if (res.data?.data?.success) { showSuccess('تم إرسال الرسالة'); onRefresh(); } else showError(res.data?.message || 'فشل الإرسال'); } catch { showError('خطأ'); } finally { setSendingId(null); } };

  // ★ إرسال للجميع
  const handleSendAll = async () => {
    const unsent = records.filter(r => !r.isSent);
    if (unsent.length === 0) { showError('جميع السجلات تم إرسالها'); return; }
    setSendingAll(true);
    try { const res = await tardinessApi.sendWhatsAppBulk(unsent.map(r => r.id)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} من ${res.data.data.total}`); onRefresh(); } } catch { showError('خطأ في الإرسال الجماعي'); } finally { setSendingAll(false); }
  };
  const handleSendBulk = async () => { if (selected.size === 0) return; try { const res = await tardinessApi.sendWhatsAppBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} من ${res.data.data.total}`); setSelected(new Set()); onRefresh(); } } catch { showError('خطأ'); } };
  const handleDeleteBulk = async () => { if (selected.size === 0) return; try { const res = await tardinessApi.deleteBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم حذف ${res.data.data.deletedCount} سجل`); setSelected(new Set()); onRefresh(); } } catch { showError('خطأ'); } };
  const handleExport = async () => { try { const stage = stageFilter || undefined; const res = await tardinessApi.exportCsv(stage); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'tardiness.csv'; a.click(); window.URL.revokeObjectURL(url); } catch { showError('خطأ في التصدير'); } };
  const handlePrintToday = () => { const toPrint = selected.size > 0 ? filtered.filter(r => selected.has(r.id)) : filtered; if (toPrint.length === 0) { showError('لا يوجد بيانات للطباعة'); return; } const stage = stageFilter || undefined; printDailyReport('tardiness', toPrint as unknown as Record<string, unknown>[], schoolSettings as any, stage); };

  const sentCount = filtered.filter(r => r.isSent).length;
  const unsentCount = filtered.length - sentCount;
  const prevCounts = useMemo(() => { const c: Record<number, number> = {}; for (const r of allRecords) c[r.studentId] = (c[r.studentId] || 0) + 1; return c; }, [allRecords]);

  return (
    <>
      {/* ★ Action bar */}
      <ActionBar
        sectionColor="#dc2626"
        leftButtons={[
          { icon: 'add_circle', label: 'تسجيل تأخر', variant: 'primary', onClick: onAdd },
          { icon: 'refresh', label: 'تحديث', variant: 'outline', onClick: onRefresh },
        ]}
        rightButtons={[
          { icon: 'send', label: sendingAll ? 'جاري...' : 'إرسال للجميع', variant: 'success', onClick: handleSendAll, disabled: sendingAll || records.filter(r => !r.isSent).length === 0 },
          { icon: 'print', label: 'طباعة', variant: 'outline', onClick: handlePrintToday },
        ]}
      />

      <FloatingBar
        count={selected.size}
        actions={[
          { icon: 'print', label: 'طباعة', variant: 'print', onClick: handlePrintToday },
          { icon: 'smartphone', label: 'إرسال', variant: 'send', onClick: handleSendBulk },
          { icon: 'delete', label: 'حذف', variant: 'delete', onClick: handleDeleteBulk },
        ]}
        onCancel={() => setSelected(new Set())}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="event_available" title="لا يوجد متأخرون اليوم" />
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table"><thead><tr style={{ background: '#dc2626' }}>
              <th style={{ width: 40 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
              <th style={{ textAlign: 'right' }}>الطالب</th><th style={{ textAlign: 'right' }}>الصف</th><th>النوع</th><th>الحصة</th><th style={{ width: 60 }}>مرات</th><th>الإرسال</th><th>إجراءات</th>
            </tr></thead><tbody>
              {filtered.map((r, idx) => {
                const tt = TARDINESS_TYPES[r.tardinessType] || { label: r.tardinessType, color: '#374151', bg: '#f3f4f6' };
                const cnt = prevCounts[r.studentId] || 1;
                const cntBg = cnt >= 4 ? '#FF9999' : cnt >= 3 ? '#FFCC99' : cnt >= 2 ? '#FFFF99' : 'transparent';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: selected.has(r.id) ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#f9fafb') }}>
                    <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td style={{ fontWeight: 600, textAlign: 'right' }}>{r.studentName}</td>
                    <td style={{ textAlign: 'right' }}>{r.grade} / {classToLetter(r.className)}</td>
                    <td><span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: tt.bg, color: tt.color }}>{tt.label}</span></td>
                    <td>{r.period || '-'}</td>
                    <td style={{ fontWeight: 700, background: cntBg }}>{cnt}</td>
                    <td>{r.isSent ? <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>تم</span> : <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>لم يُرسل</span>}</td>
                    <td><div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => handleSendWhatsApp(r)} disabled={sendingId === r.id} title="إرسال واتساب" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: sendingId === r.id ? 'not-allowed' : 'pointer', opacity: sendingId === r.id ? .5 : 1 }}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>smartphone</span></button>
                      <button onClick={() => printForm('tawtheeq_tawasol', { studentName: r.studentName, grade: r.grade + ' / ' + classToLetter(r.className), contactType: 'تأخر', contactReason: (tt.label) + (r.period ? ' - ' + r.period : ''), violationDate: r.hijriDate || '', contactResult: r.isSent ? 'تم التواصل' : 'لم يتم الإرسال' }, schoolSettings as any)} title="توثيق تواصل" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>contact_phone</span></button>
                      <button onClick={() => setConfirmDelete(r)} title="حذف" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>delete</span></button>
                    </div></td>
                  </tr>);
              })}
            </tbody></table>
          </div>
          {/* ★ شريط عدادات ملونة أسفل الجدول */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', flexWrap: 'wrap', fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff', border: '1px solid #d1d5db', display: 'inline-block' }} /> مرة واحدة</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#FFFF99', display: 'inline-block' }} /> مرتين</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#FFCC99', display: 'inline-block' }} /> ٣ مرات</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#FF9999', display: 'inline-block' }} /> ٤+ مرات</span>
            <span style={{ marginRight: 'auto' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#d1fae5', display: 'inline-block' }} /> تم: {sentCount}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#fef3c7', display: 'inline-block' }} /> لم يُرسل: {unsentCount}</span>
          </div>
        </div>
      )}
      {confirmDelete && <ConfirmModal title="تأكيد حذف سجل التأخر" message={`هل أنت متأكد من حذف سجل التأخر للطالب ${confirmDelete.studentName}؟`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
      {msgEditorRow && (() => {
        const hijriDate = msgEditorRow.hijriDate || new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' });
        const typeLabel = TARDINESS_TYPES[msgEditorRow.tardinessType]?.label || msgEditorRow.tardinessType;
        const defaultMsg = `ولي أمر الطالب / ${msgEditorRow.studentName}\nالسلام عليكم ورحمة الله وبركاته\nنفيدكم بأن ابنكم قد سُجّل عليه ${typeLabel}${msgEditorRow.period ? ` (${msgEditorRow.period})` : ''} بتاريخ ${hijriDate}.\nنأمل متابعة الطالب والحرص على الحضور في الوقت المحدد.\nمع تحيات إدارة المدرسة`;
        return <SendMessageModal
          studentName={msgEditorRow.studentName}
          mobile={msgEditorRow.mobile}
          defaultMessage={defaultMsg}
          templateType="تأخر"
          templatePlaceholders={{ '{اسم_الطالب}': msgEditorRow.studentName, '{نوع_التأخر}': typeLabel, '{الحصة}': msgEditorRow.period || '', '{التاريخ}': hijriDate }}
          onSend={(msg) => handleConfirmSend(msgEditorRow, msg)}
          onClose={() => setMsgEditorRow(null)}
        />;
      })()}
    </>
  );
};


// ============================== Approved Tab ==============================
const ApprovedTab: React.FC<{ records: TardinessRow[]; onRefresh: () => void; schoolSettings: Record<string, string>; stageFilter: string }> = ({ records, onRefresh, schoolSettings, stageFilter }) => {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [gradeFilter, setGradeFilter] = useState(''); const [classFilter, setClassFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const [viewMode, setViewMode] = useState<'cards'|'table'>('cards');
  const [detailStudent, setDetailStudent] = useState<{ studentId: number; studentName: string } | null>(null);

  const studentGroups = useMemo(() => {
    let list = records;
    if (typeFilter) list = list.filter(r => r.tardinessType === typeFilter);
    if (gradeFilter) list = list.filter(r => r.grade === gradeFilter);
    if (classFilter) list = list.filter(r => r.className === classFilter);
    if (dateFrom) list = list.filter(r => r.hijriDate >= dateFrom);
    if (dateTo) list = list.filter(r => r.hijriDate <= dateTo);
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    const groups = new Map<number, { student: TardinessRow; records: TardinessRow[] }>();
    for (const r of list) { if (!groups.has(r.studentId)) groups.set(r.studentId, { student: r, records: [] }); groups.get(r.studentId)!.records.push(r); }
    return Array.from(groups.values()).sort((a, b) => b.records.length - a.records.length);
  }, [records, typeFilter, gradeFilter, classFilter, search, dateFrom, dateTo]);

  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map(r => r.grade)))), [records]);
  const classes = useMemo(() => sortClasses(Array.from(new Set(records.filter(r => !gradeFilter || r.grade === gradeFilter).map(r => r.className)))), [records, gradeFilter]);
  const allFilteredRecords = useMemo(() => {
    let list = records;
    if (typeFilter) list = list.filter(r => r.tardinessType === typeFilter);
    if (gradeFilter) list = list.filter(r => r.grade === gradeFilter);
    if (classFilter) list = list.filter(r => r.className === classFilter);
    if (dateFrom) list = list.filter(r => r.hijriDate >= dateFrom);
    if (dateTo) list = list.filter(r => r.hijriDate <= dateTo);
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    return list;
  }, [records, typeFilter, gradeFilter, classFilter, dateFrom, dateTo, search]);

  const handlePrintArchive = () => { if (allFilteredRecords.length === 0) { showError('لا يوجد بيانات للطباعة'); return; } printDailyReport('tardiness', allFilteredRecords as unknown as Record<string, unknown>[], schoolSettings as any); };

  // ★ تقرير التواصل
  const handlePrintContactReport = () => {
    const sent = allFilteredRecords.filter(r => r.isSent);
    if (sent.length === 0) { showError('لا يوجد سجلات تم إرسالها'); return; }
    const hijri = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows: ListReportRow[] = sent.map((r, i) => ({ cells: [toIndic(i+1), `<span style="font-weight:bold">${escapeHtml(r.studentName)}</span>`, escapeHtml(r.grade+' / '+classToLetter(r.className)), escapeHtml(TARDINESS_TYPES[r.tardinessType]?.label||r.tardinessType), toIndic(r.hijriDate||'-'), '<span style="color:green;font-weight:bold">تم</span>'] }));
    printListReport({ title: 'تقرير التواصل مع أولياء الأمور — التأخر' + (stageFilter ? ' (' + (SETTINGS_STAGES.find(s => s.id === stageFilter)?.name || stageFilter) + ')' : ''), dateText: hijri + ' | عدد الطلاب: ' + toIndic(sent.length), headers: [{ label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' }, { label: 'الصف', width: '12%' }, { label: 'نوع التأخر', width: '15%' }, { label: 'التاريخ', width: '15%' }, { label: 'التواصل', width: '10%' }], rows, summary: toIndic(sent.length) + ' سجل' }, schoolSettings as any);
  };

  return (
    <>
      {/* ★ أزرار: تحديث + طباعة القائمة + تقرير التواصل */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={onRefresh} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> تحديث</button>
        <button onClick={handlePrintArchive} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> طباعة القائمة</button>
        <button onClick={handlePrintContactReport} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>contact_phone</span> تقرير التواصل</button>
      </div>
      {/* ★ فلاتر مدمجة في بطاقة واحدة */}
      <div style={{ background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم..." style={{ width: 180, padding: '6px 12px', border: '2px solid #d1d5db', borderRadius: 12, fontSize: 13 }} />
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setClassFilter(''); }} style={{ height: 34, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, background: '#f9fafb' }}><option value="">كل الصفوف</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ height: 34, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, background: '#f9fafb' }}><option value="">كل الفصول</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: 34, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, background: '#f9fafb' }}><option value="">كل الأنواع</option>{Object.entries(TARDINESS_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <HijriDatePicker value={dateFrom} onChange={setDateFrom} placeholder="من تاريخ" accentColor="#dc2626" />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>إلى</span>
          <HijriDatePicker value={dateTo} onChange={setDateTo} placeholder="إلى تاريخ" accentColor="#dc2626" />
          <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 'auto' }}>{allFilteredRecords.length} سجل</span>
          <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? '#fff' : 'transparent', color: viewMode === 'cards' ? '#dc2626' : '#9ca3af', fontSize: 12, fontWeight: 700 }}>بطاقات</button>
            <button onClick={() => setViewMode('table')} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#dc2626' : '#9ca3af', fontSize: 12, fontWeight: 700 }}>جدول</button>
          </div>
        </div>
      </div>

      {studentGroups.length === 0 ? (
        <EmptyState icon="search_off" title="لا توجد سجلات مطابقة" />
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {studentGroups.map(({ student, records: rList }) => {
            const morning = rList.filter(r => r.tardinessType === 'Morning').length;
            const period = rList.filter(r => r.tardinessType === 'Period').length;
            const assembly = rList.filter(r => r.tardinessType === 'Assembly').length;
            const total = rList.length;
            const borderColor = total >= 10 ? '#dc2626' : total >= 7 ? '#f87171' : total >= 5 ? '#fb923c' : total >= 3 ? '#facc15' : '#e5e7eb';
            const badge = total >= 10 ? { t: 'متكرر جداً', bg: '#dc2626', c: '#fff' } : total >= 7 ? { t: 'متكرر', bg: '#fee2e2', c: '#991b1b' } : total >= 5 ? { t: 'ملاحظ', bg: '#ffedd5', c: '#9a3412' } : total >= 3 ? { t: 'تنبيه', bg: '#fef9c3', c: '#854d0e' } : null;
            return (
              <div key={student.studentId} onClick={() => setDetailStudent({ studentId: student.studentId, studentName: student.studentName })} style={{ background: '#fff', borderRadius: 12, border: `2px solid ${borderColor}`, padding: 16, cursor: 'pointer', transition: 'box-shadow .2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 22, fontWeight: 900, color: total >= 7 ? '#dc2626' : total >= 4 ? '#ea580c' : '#6b7280' }}>{total}</span><span style={{ fontSize: 10, color: '#9ca3af' }}>تأخر</span></div>
                  {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: badge.bg, color: badge.c }}>{badge.t}</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{student.studentName}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{student.grade} / {classToLetter(student.className)}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
                  {morning > 0 && <div style={{ flex: 1, textAlign: 'center', borderRadius: 8, padding: '6px 4px', background: '#fee2e2', border: '1px solid #fecaca' }}><div style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>{morning}</div><div style={{ fontSize: 8, color: '#dc2626' }}>صباحي</div></div>}
                  {period > 0 && <div style={{ flex: 1, textAlign: 'center', borderRadius: 8, padding: '6px 4px', background: '#fef3c7', border: '1px solid #fde68a' }}><div style={{ fontSize: 16, fontWeight: 900, color: '#d97706' }}>{period}</div><div style={{ fontSize: 8, color: '#d97706' }}>حصة</div></div>}
                  {assembly > 0 && <div style={{ flex: 1, textAlign: 'center', borderRadius: 8, padding: '6px 4px', background: '#fef9c3', border: '1px solid #fde68a' }}><div style={{ fontSize: 16, fontWeight: 900, color: '#ca8a04' }}>{assembly}</div><div style={{ fontSize: 8, color: '#ca8a04' }}>اصطفاف</div></div>}
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#7c3aed', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span> عرض التفاصيل</div>
              </div>);
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}><table className="data-table"><thead><tr><th>الطالب</th><th>الصف</th><th>العدد</th><th>صباحي</th><th>حصة</th><th>اصطفاف</th><th style={{ textAlign: 'center' }}>تفاصيل</th></tr></thead><tbody>
          {studentGroups.map(({ student, records: rList }) => (<tr key={student.studentId}><td style={{ fontWeight: 700 }}>{student.studentName}</td><td>{student.grade} ({classToLetter(student.className)})</td><td style={{ fontWeight: 700, color: '#ea580c' }}>{rList.length}</td><td>{rList.filter(r => r.tardinessType === 'Morning').length}</td><td>{rList.filter(r => r.tardinessType === 'Period').length}</td><td>{rList.filter(r => r.tardinessType === 'Assembly').length}</td><td style={{ textAlign: 'center' }}><button onClick={() => setDetailStudent({ studentId: student.studentId, studentName: student.studentName })} style={{ padding: '4px 12px', background: '#fff7ed', color: '#ea580c', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>عرض</button></td></tr>))}
        </tbody></table></div>
      )}

      {detailStudent && <StudentDetailModal studentName={detailStudent.studentName} records={records.filter(r => r.studentId === detailStudent.studentId)} onClose={() => setDetailStudent(null)} onRefresh={onRefresh} schoolSettings={schoolSettings} />}
    </>
  );
};

// ============================== Student Detail Modal ==============================
const StudentDetailModal: React.FC<{ studentName: string; records: TardinessRow[]; onClose: () => void; onRefresh: () => void; schoolSettings: Record<string, string> }> = ({ studentName, records, onClose, onRefresh, schoolSettings }) => {
  const handleSendAll = async () => { const unsent = records.filter(r => !r.isSent); if (unsent.length === 0) { showError('جميع السجلات تم إرسالها'); return; } try { const res = await tardinessApi.sendWhatsAppBulk(unsent.map(r => r.id)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} رسالة`); onRefresh(); } } catch { showError('خطأ'); } };
  // ★ طباعة بـ printListReport + toIndic
  const handlePrint = () => {
    const hijri = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows: ListReportRow[] = records.map((r, i) => ({ cells: [toIndic(i+1), toIndic(r.hijriDate||'-'), escapeHtml(TARDINESS_TYPES[r.tardinessType]?.label||r.tardinessType), toIndic(r.period||'-'), r.isSent ? '<span style="color:green;font-weight:bold">تم</span>' : '<span style="color:#999">لا</span>'] }));
    printListReport({ title: `سجل التأخر — ${studentName}`, dateText: hijri, statsBar: `إجمالي: ${toIndic(records.length)} | صباحي: ${toIndic(records.filter(r=>r.tardinessType==='Morning').length)} | حصة: ${toIndic(records.filter(r=>r.tardinessType==='Period').length)} | اصطفاف: ${toIndic(records.filter(r=>r.tardinessType==='Assembly').length)}`, headers: [{ label: 'م', width: '8%' }, { label: 'التاريخ', width: '25%' }, { label: 'النوع', width: '25%' }, { label: 'الحصة', width: '20%' }, { label: 'الإرسال', width: '12%' }], rows, summary: `إجمالي: ${toIndic(records.length)} تأخر` }, schoolSettings as any);
  };
  const handlePrintContact = () => { printForm('tawtheeq_tawasol', { studentName, grade: records[0] ? records[0].grade + ' / ' + classToLetter(records[0].className) : '', contactType: 'تأخر', contactReason: 'تأخر متكرر', violationDate: new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura'), contactResult: 'تم التواصل عبر الواتساب' }, schoolSettings as any); };
  const mc = records.filter(r => r.tardinessType === 'Morning').length, pc = records.filter(r => r.tardinessType === 'Period').length, ac = records.filter(r => r.tardinessType === 'Assembly').length, sc = records.filter(r => r.isSent).length;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,.25)', width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'linear-gradient(to left, #dc2626, #ef4444)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>timer_off</span> {studentName}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrintContact} style={{ padding: '6px 12px', background: 'rgba(255,255,255,.2)', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>contact_phone</span> توثيق تواصل</button>
            <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.8)', fontSize: 24 }}><span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span></button>
          </div>
        </div>
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: 10, background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{records.length}</div><div style={{ fontSize: 10, color: '#dc2626' }}>الإجمالي</div></div>
            <div style={{ textAlign: 'center', padding: 10, background: '#ffedd5', borderRadius: 12, border: '1px solid #fed7aa' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#ea580c' }}>{mc}</div><div style={{ fontSize: 10, color: '#ea580c' }}>صباحي</div></div>
            <div style={{ textAlign: 'center', padding: 10, background: '#fef3c7', borderRadius: 12, border: '1px solid #fde68a' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#d97706' }}>{pc}</div><div style={{ fontSize: 10, color: '#d97706' }}>حصة</div></div>
            <div style={{ textAlign: 'center', padding: 10, background: '#fef9c3', borderRadius: 12, border: '1px solid #fde68a' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#ca8a04' }}>{ac}</div><div style={{ fontSize: 10, color: '#ca8a04' }}>اصطفاف</div></div>
            <div style={{ textAlign: 'center', padding: 10, background: '#dcfce7', borderRadius: 12, border: '1px solid #bbf7d0' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#15803d' }}>{sc}</div><div style={{ fontSize: 10, color: '#15803d' }}>تم إرسالها</div></div>
          </div>
          <table className="data-table"><thead><tr><th>#</th><th>النوع</th><th>الحصة</th><th>التاريخ</th><th>المسجل</th><th>الإرسال</th></tr></thead><tbody>
            {records.map((r, i) => { const tt = TARDINESS_TYPES[r.tardinessType] || { label: r.tardinessType, color: '#374151', bg: '#f3f4f6' }; return (
              <tr key={r.id}><td style={{ color: '#6b7280', textAlign: 'center' }}>{i+1}</td><td><span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: tt.bg, color: tt.color }}>{tt.label}</span></td><td>{r.period||'-'}</td><td style={{ fontSize: 13 }}>{r.hijriDate}</td><td style={{ fontSize: 12, color: '#6b7280' }}>{r.recordedBy}</td><td>{r.isSent ? <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#15803d' }}>check_circle</span> : <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ea580c' }}>close</span>}</td></tr>); })}
          </tbody></table>
        </div>
        <div style={{ padding: '12px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSendAll} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>smartphone</span> إرسال الكل</button>
            <button onClick={handlePrint} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>print</span> طباعة</button>
          </div>
          <button onClick={onClose} style={{ padding: '8px 16px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
};

// ============================== Reports Tab ==============================
const ReportsTab: React.FC<{ records: TardinessRow[]; schoolSettings: Record<string, string> }> = ({ records, schoolSettings }) => {
  const [gradeFilter, setGradeFilter] = useState(''); const [classFilter, setClassFilter] = useState(''); const [filtered, setFiltered] = useState(records);
  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map(r => r.grade)))), [records]);
  const classes = useMemo(() => { if (!gradeFilter) return []; return sortClasses(Array.from(new Set(records.filter(r => r.grade === gradeFilter).map(r => r.className)))); }, [records, gradeFilter]);
  const handleUpdate = () => { let l = records; if (gradeFilter) l = l.filter(r => r.grade === gradeFilter); if (classFilter) l = l.filter(r => r.className === classFilter); setFiltered(l); };
  useEffect(() => { setFiltered(records); }, [records]);
  const mc = filtered.filter(r => r.tardinessType === 'Morning').length, pc = filtered.filter(r => r.tardinessType === 'Period').length, ac = filtered.filter(r => r.tardinessType === 'Assembly').length;
  const uniqueStudents = new Set(filtered.map(r => r.studentId)).size;
  const topStudents = useMemo(() => { const g = new Map<number, { name: string; grade: string; cls: string; count: number }>(); for (const r of filtered) { const x = g.get(r.studentId) || { name: r.studentName, grade: r.grade, cls: classToLetter(r.className), count: 0 }; x.count++; g.set(r.studentId, x); } return Array.from(g.entries()).map(([id, x]) => ({ id, ...x })).sort((a, b) => b.count - a.count).slice(0, 10); }, [filtered]);
  const byClass = useMemo(() => { const g = new Map<string, number>(); for (const r of filtered) { const k = `${r.grade} ${classToLetter(r.className)}`; g.set(k, (g.get(k)||0)+1); } return Array.from(g.entries()).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count); }, [filtered]);
  const maxC = Math.max(...byClass.map(c => c.count), 1);
  const handlePrint = () => {
    if (topStudents.length === 0) { showError('لا يوجد بيانات'); return; }
    const hijri = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows: ListReportRow[] = topStudents.map((s, i) => ({ cells: [toIndic(i+1), `<span style="font-weight:bold">${escapeHtml(s.name)}</span>`, escapeHtml(s.grade+' '+s.cls), `<span style="font-weight:bold;color:#dc2626">${toIndic(s.count)}</span>`] }));
    printListReport({ title: 'تقرير التأخر', dateText: hijri, statsBar: `الإجمالي: ${toIndic(filtered.length)} | صباحي: ${toIndic(mc)} | حصة: ${toIndic(pc)} | اصطفاف: ${toIndic(ac)}`, headers: [{ label: 'م', width: '8%' }, { label: 'الطالب', width: '40%' }, { label: 'الصف', width: '25%' }, { label: 'العدد', width: '15%' }], rows, summary: `${toIndic(topStudents.length)} طالب` }, schoolSettings as any);
  };

  return (
    <>
      {/* ★ فلتر + زر تحديث */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>الصف</label><select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setClassFilter(''); }} style={{ height: 40, width: 160, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}><option value="">كل الصفوف</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>الفصل</label><select value={classFilter} onChange={e => setClassFilter(e.target.value)} disabled={!gradeFilter} style={{ height: 40, width: 130, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: gradeFilter ? '#fff' : '#f9fafb' }}><option value="">كل الفصول</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <button onClick={handleUpdate} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> تحديث</button>
        </div>
      </div>
      {/* ★ 4 بطاقات: إجمالي(أحمر) + طلاب(أزرق) + صباحي(أصفر) + حصة(بنفسجي) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', borderRight: '4px solid #dc2626' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>{filtered.length}</div><div style={{ fontSize: 13, color: '#6b7280' }}>إجمالي التأخر</div></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', borderRight: '4px solid #3b82f6' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>{uniqueStudents}</div><div style={{ fontSize: 13, color: '#6b7280' }}>عدد الطلاب</div></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', borderRight: '4px solid #f59e0b' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>{mc}</div><div style={{ fontSize: 13, color: '#6b7280' }}>تأخر صباحي</div></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', borderRight: '4px solid #8b5cf6' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', marginBottom: 4 }}>{pc}</div><div style={{ fontSize: 13, color: '#6b7280' }}>تأخر حصة</div></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', borderRight: '4px solid #ca8a04' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#ca8a04', marginBottom: 4 }}>{ac}</div><div style={{ fontSize: 13, color: '#6b7280' }}>تأخر اصطفاف</div></div>
      </div>
      {/* ★ عمودين: أكثر الطلاب + حسب الفصل */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#fef2f2' }}><h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>trending_up</span> أكثر الطلاب تأخراً</h4></div>
          <div style={{ padding: 12 }}>{topStudents.length === 0 ? <p style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>اضغط "تحديث"</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{topStudents.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 8, background: i < 3 ? '#fef2f2' : '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? '#dc2626' : '#d1d5db', color: i < 3 ? '#fff' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i+1}</span><div><span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span><span style={{ fontSize: 11, color: '#9ca3af', marginRight: 8 }}>{s.grade} {s.cls}</span></div></div>
              <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>{s.count} مرة</span>
            </div>))}</div>}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#fffbeb' }}><h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b' }}>school</span> التأخر حسب الفصل</h4></div>
          <div style={{ padding: 12 }}>{byClass.length === 0 ? <p style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>اضغط "تحديث"</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{byClass.slice(0, 10).map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 120, fontSize: 13, fontWeight: 600, color: '#4b5563', flexShrink: 0 }}>{c.name}</span>
              <div style={{ flex: 1, height: 16, background: '#f3f4f6', borderRadius: 9999, overflow: 'hidden' }}><div style={{ width: `${Math.max((c.count/maxC)*100, 5)}%`, height: '100%', background: '#dc2626', borderRadius: 9999 }} /></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', width: 40, textAlign: 'left' }}>{c.count}</span>
            </div>))}</div>}</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}><button onClick={handlePrint} style={btnOutline('#dc2626')}><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>print</span> طباعة التقرير</button></div>
    </>
  );
};

// ============================== Shared ==============================
const ConfirmModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ title, message, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,.25)', width: '100%', maxWidth: 400, padding: 24 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: '0 0 24px', color: '#4b5563' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={onConfirm} style={{ padding: '8px 24px', background: '#dc2626', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>تأكيد</button>
      </div>
    </div>
  </div>
);

// ============================== Add Tardiness Modal ==============================
const AddTardinessModal: React.FC<{ stages: StageConfigData[]; stageFilter: string; onClose: () => void; onSaved: () => void }> = ({ stageFilter, onClose, onSaved }) => {
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [tardinessType, setTardinessType] = useState('Morning');
  const [period, setPeriod] = useState('');
  const [saving, setSaving] = useState(false);

  const stageId = stageFilter || '';

  const handleSave = async () => {
    if (selectedStudents.length === 0) return showError('اختر طالب واحد على الأقل');
    if (tardinessType === 'Period' && !period) return showError('يرجى اختيار الحصة');
    setSaving(true);
    try {
      if (selectedStudents.length === 1) {
        const res = await tardinessApi.add({ studentId: selectedStudents[0].id, tardinessType, period });
        if (res.data?.success) { showSuccess('تم تسجيل التأخر'); onSaved(); } else showError(res.data?.message || 'فشل');
      } else {
        const res = await tardinessApi.addBatch(selectedStudents.map(s => s.id), tardinessType, period);
        if (res.data?.data) { showSuccess(res.data.data.message || 'تم التسجيل'); onSaved(); } else showError(res.data?.message || 'فشل');
      }
    } catch { showError('فشل التسجيل'); }
    finally { setSaving(false); }
  };

  return (
    <InputModal
      title="تسجيل تأخر"
      icon="timer_off"
      headerBg="linear-gradient(to left, #dc2626, #ef4444)"
      accentColor="#dc2626"
      saveLabel="حفظ"
      counterText={`${selectedStudents.length} طالب محدد`}
      maxWidth={560}
      saving={saving}
      onClose={onClose}
      onSave={handleSave}
    >
      {/* نوع التأخر */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>نوع التأخر *</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: `2px solid ${tardinessType === 'Morning' ? '#dc2626' : '#d1d5db'}`, background: tardinessType === 'Morning' ? '#fef2f2' : '#fff', borderRadius: 8, cursor: 'pointer' }}>
            <input type="radio" name="tard-type" checked={tardinessType === 'Morning'} onChange={() => { setTardinessType('Morning'); setPeriod(''); }} />
            <span style={{ fontWeight: 700, color: tardinessType === 'Morning' ? '#dc2626' : '#374151' }}>تأخر صباحي</span>
          </label>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: `2px solid ${tardinessType === 'Period' ? '#f59e0b' : '#d1d5db'}`, background: tardinessType === 'Period' ? '#fffbeb' : '#fff', borderRadius: 8, cursor: 'pointer' }}>
            <input type="radio" name="tard-type" checked={tardinessType === 'Period'} onChange={() => setTardinessType('Period')} />
            <span style={{ fontWeight: 700, color: tardinessType === 'Period' ? '#d97706' : '#374151' }}>تأخر حصة</span>
          </label>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: `2px solid ${tardinessType === 'Assembly' ? '#ca8a04' : '#d1d5db'}`, background: tardinessType === 'Assembly' ? '#fef9c3' : '#fff', borderRadius: 8, cursor: 'pointer' }}>
            <input type="radio" name="tard-type" checked={tardinessType === 'Assembly'} onChange={() => { setTardinessType('Assembly'); setPeriod(''); }} />
            <span style={{ fontWeight: 700, color: tardinessType === 'Assembly' ? '#ca8a04' : '#374151' }}>تأخر اصطفاف</span>
          </label>
        </div>
      </div>
      {tardinessType === 'Period' && (
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>الحصة *</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
            <option value="">اختر الحصة</option>
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
      {/* اختيار الطلاب — المكون المشترك */}
      <StudentSelector
        stageFilter={stageId || undefined}
        onSelectionChange={setSelectedStudents}
        accentColor="#dc2626"
        accentBg="#fef2f2"
      />
    </InputModal>
  );
};

export default TardinessPage;
