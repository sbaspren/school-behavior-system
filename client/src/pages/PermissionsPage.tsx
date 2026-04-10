import React, { useState, useEffect, useMemo } from 'react';
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
import { permissionsApi, PermissionData } from '../api/permissions';
import { StageConfigData } from '../api/settings';
import { showSuccess, showError } from '../components/shared/Toast';
import { SETTINGS_STAGES, PERMISSION_REASONS, sortGrades, sortClasses, btnOutline } from '../utils/constants';
import { printForm, printListReport, ListReportRow } from '../utils/printTemplates';
import { printDailyReport } from '../utils/printDaily';
import { toIndic, escapeHtml, getTodayDates, classToLetter } from '../utils/printUtils';
import SendMessageModal from '../components/shared/SendMessageModal';
import { usePageData, getHijriDate } from '../hooks/usePageData';
import type { PermissionRow, StudentOption } from '../types';

type TabType = 'today' | 'approved';

const PermissionsPage: React.FC = () => {
  const {
    records, setRecords, stages, loading, schoolSettings,
    stageFilter, setStageFilter, enabledStages,
    filteredByStage, todayRecords, refresh,
  } = usePageData<PermissionRow>({ fetchRecords: (stage) => permissionsApi.getAll(stage ? { stage } : undefined) });

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  const stageLabel = SETTINGS_STAGES.find((s) => s.id === stageFilter)?.name || stageFilter;

  return (
    <div className="sec-permissions">
      {/* Hero Banner — مطابق لـ .page-hero: gradient سماوي + عدادات */}
      <PageHero
        title={`الاستئذان — ${stageLabel}`}
        subtitle={getHijriDate()}
        gradient="linear-gradient(135deg, #0891b2, #06b6d4)"
        accentColor="#0891b2" variant="outlined"
        stats={[
          { icon: 'exit_to_app', label: 'مستأذنو اليوم', value: todayRecords.length, color: '#fbbf24' },
          { icon: 'bar_chart', label: 'إجمالي الاستئذان', value: filteredByStage.length, color: '#c084fc' },
          { icon: 'send', label: 'لم تُرسل', value: filteredByStage.filter((r) => !r.isSent).length, color: '#f87171' },
        ]}
      />

      {/* Tabs — مطابق لـ .tabs-bar: 3 tabs بلون سماوي */}
      <TabBar
        tabs={[
          { id: 'today', label: 'اليومي', icon: 'today' },
          { id: 'approved', label: 'المعتمد', icon: 'verified' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        sectionColor="#0891b2"
      />

      {activeTab === 'today' && <TodayTab records={todayRecords} onRefresh={refresh} stageFilter={stageFilter} schoolSettings={schoolSettings} onAdd={() => setModalOpen(true)} />}
      {activeTab === 'approved' && <ApprovedTab records={filteredByStage} onRefresh={refresh} schoolSettings={schoolSettings} />}
      {modalOpen && <AddPermissionModal stages={enabledStages} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); refresh(); }} />}
    </div>
  );
};

// ============================================================
// Today Tab
// ============================================================
const TodayTab: React.FC<{ records: PermissionRow[]; onRefresh: () => void; stageFilter: string; schoolSettings: Record<string, string>; onAdd: () => void }> = ({ records, onRefresh, stageFilter, schoolSettings, onAdd }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<PermissionRow | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [msgEditorRow, setMsgEditorRow] = useState<PermissionRow | null>(null);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q));
  }, [records, search]);

  const toggleSelect = (id: number) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((r) => r.id))); };

  const handleDelete = async () => { if (!confirmDelete) return; try { await permissionsApi.delete(confirmDelete.id); showSuccess('تم الحذف'); setConfirmDelete(null); onRefresh(); } catch { showError('خطأ'); } };

  const handleSendWhatsApp = (r: PermissionRow) => {
    setMsgEditorRow(r);
  };

  const handleConfirmSend = async (r: PermissionRow, message: string) => {
    setSendingId(r.id);
    setMsgEditorRow(null);
    try { const res = await permissionsApi.sendWhatsApp(r.id, { message }); if (res.data?.data?.success) { showSuccess('تم الإرسال'); onRefresh(); } else showError(res.data?.message || 'فشل'); }
    catch { showError('خطأ'); } finally { setSendingId(null); }
  };

  const handleSendBulk = async () => {
    if (selected.size === 0) return;
    try { const res = await permissionsApi.sendWhatsAppBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} من ${res.data.data.total}`); setSelected(new Set()); onRefresh(); } }
    catch { showError('خطأ'); }
  };

  const handleDeleteBulk = async () => {
    if (selected.size === 0) return;
    try { const res = await permissionsApi.deleteBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم حذف ${res.data.data.deletedCount}`); setSelected(new Set()); onRefresh(); } }
    catch { showError('خطأ'); }
  };

  const handleConfirmExit = async (r: PermissionRow) => {
    try { const res = await permissionsApi.confirmExit(r.id); if (res.data?.success) { showSuccess('تم تأكيد الخروج'); onRefresh(); } } catch { showError('خطأ'); }
  };

  const handleExport = async () => {
    try {
      const stage = stageFilter || undefined;
      const res = await permissionsApi.exportCsv(stage);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'permissions.csv'; a.click(); window.URL.revokeObjectURL(url);
    } catch { showError('خطأ في التصدير'); }
  };

  const handlePrint = () => {
    const toPrint = selected.size > 0 ? filtered.filter(r => selected.has(r.id)) : filtered;
    if (toPrint.length === 0) { showError('لا يوجد بيانات للطباعة'); return; }
    const stage = stageFilter || undefined;
    printDailyReport('permissions', toPrint as unknown as Record<string, unknown>[], schoolSettings as any, stage);
  };

  const unsentCount = filtered.filter(r => !r.isSent).length;
  const confirmedCount = filtered.filter(r => r.confirmationTime).length;
  const pendingCount = filtered.filter(r => !r.confirmationTime).length;
  const sentCount = filtered.filter(r => r.isSent).length;

  const unsentFiltered = filtered.filter(r => !r.isSent);
  const handleSendAll = () => {
    if (unsentFiltered.length === 0) { showError('تم إرسال الجميع سابقاً'); return; }
    setBulkPreviewOpen(true);
  };
  const handleConfirmSendAll = async () => {
    setBulkPreviewOpen(false);
    try { const res = await permissionsApi.sendWhatsAppBulk(unsentFiltered.map(r => r.id)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} من ${unsentFiltered.length}`); onRefresh(); } }
    catch { showError('خطأ'); }
  };

  return (
    <>
      <ActionBar
        sectionColor="#0891b2"
        leftButtons={[
          { icon: 'add_circle', label: 'تسجيل استئذان', variant: 'primary', onClick: onAdd },
          { icon: 'refresh', label: 'تحديث', variant: 'outline', onClick: onRefresh },
        ]}
        rightButtons={[
          { icon: 'send', label: 'إرسال للجميع', variant: 'success', onClick: handleSendAll, disabled: unsentCount === 0 },
          { icon: 'print', label: 'طباعة', variant: 'outline', onClick: handlePrint },
        ]}
      />

      {/* Floating Selection Bar */}
      <FloatingBar
        count={selected.size}
        actions={[
          { icon: 'print', label: 'طباعة', variant: 'print', onClick: handlePrint },
          { icon: 'smartphone', label: 'إرسال', variant: 'send', onClick: handleSendBulk },
          { icon: 'delete', label: 'حذف', variant: 'delete', onClick: handleDeleteBulk },
        ]}
        onCancel={() => setSelected(new Set())}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="door_front" title="لا توجد حالات استئذان لهذا اليوم" />
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr style={{ background: '#0891b2' }}>
                <th style={{ width: '40px' }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
                <th style={{ textAlign: 'right' }}>الطالب</th><th style={{ textAlign: 'right' }}>الصف</th><th>وقت الخروج</th><th style={{ textAlign: 'right' }}>السبب</th><th style={{ textAlign: 'right' }}>المستلم</th><th>التأكيد</th><th>الإرسال</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: selected.has(r.id) ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#f9fafb') }}>
                    <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td style={{ fontWeight: 600, textAlign: 'right' }}>{r.studentName}</td>
                    <td style={{ textAlign: 'right' }}>{r.grade} / {classToLetter(r.className)}</td>
                    <td>{r.exitTime || '-'}</td>
                    <td style={{ textAlign: 'right' }}><span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed' }}>{r.reason || '-'}</span></td>
                    <td style={{ textAlign: 'right' }}>{r.receiver || '-'}</td>
                    <td>
                      {r.confirmationTime ? (
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>{r.confirmationTime}</span>
                      ) : (
                        <button onClick={() => handleConfirmExit(r)} style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', background: '#fef3c7', color: '#92400e', fontWeight: 700, border: 'none', cursor: 'pointer' }}>تأكيد</button>
                      )}
                    </td>
                    <td>
                      {r.isSent ? <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>تم</span>
                        : <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>لم يُرسل</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => handleSendWhatsApp(r)} disabled={sendingId === r.id} title="إرسال واتساب" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: sendingId === r.id ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: sendingId === r.id ? 0.5 : 1 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span></button>
                        <button onClick={() => { printForm('tawtheeq_tawasol', { studentName: r.studentName, grade: r.grade + ' / ' + classToLetter(r.className), contactType: 'استئذان', contactReason: 'استئذان: ' + (r.reason || ''), violationDate: r.hijriDate || '', contactResult: r.isSent ? 'تم التواصل' : 'لم يتم الإرسال' }, schoolSettings as any); }} title="توثيق تواصل" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>contact_phone</span></button>
                        <button onClick={() => setConfirmDelete(r)} title="حذف" style={{ padding: '4px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && <ConfirmModal title="تأكيد حذف الاستئذان" message={`حذف سجل الاستئذان للطالب ${confirmDelete.studentName}؟`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}

      {/* شريط أسفل الجدول — مطابق للقديم */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', padding: '10px 16px', background: '#f9fafb', borderRadius: '8px', marginTop: '8px', fontSize: '13px', fontWeight: 600, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dcfce7', border: '1px solid #86efac' }} /> مؤكد: {confirmedCount}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fef3c7', border: '1px solid #fde68a' }} /> معلق: {pendingCount}</span>
          <span style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d1fae5' }} /> تم: {sentCount}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fef3c7' }} /> لم يُرسل: {unsentCount}</span>
        </div>
      )}

      {bulkPreviewOpen && (
        <SendMessageModal
          studentName="إشعار استئذان"
          defaultMessage={`المكرم ولي أمر الطالب / {اسم_الطالب}\nالسلام عليكم\nنود إبلاغكم باستئذان ابنكم للخروج من المدرسة\nالسبب: {السبب}\nوقت الخروج: {وقت_الخروج}\nالتاريخ: {التاريخ}`}
          onSend={handleConfirmSendAll}
          onClose={() => setBulkPreviewOpen(false)}
          isBulkPreview
          bulkCount={unsentFiltered.length}
          enableSms={false}
        />
      )}
      {msgEditorRow && (() => {
        const hijriDate = msgEditorRow.hijriDate || new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' });
        const defaultMsg = `ولي أمر الطالب / ${msgEditorRow.studentName}\nالسلام عليكم ورحمة الله وبركاته\nنفيدكم بأن ابنكم قد تم تسجيل استئذان له بتاريخ ${hijriDate}${msgEditorRow.exitTime ? ` الساعة ${msgEditorRow.exitTime}` : ''}${msgEditorRow.reason ? ` بسبب: ${msgEditorRow.reason}` : ''}${msgEditorRow.receiver ? `\nوتم تسليمه إلى: ${msgEditorRow.receiver}` : ''}.\nمع تحيات إدارة المدرسة`;
        return <SendMessageModal
          studentName={msgEditorRow.studentName}
          mobile={msgEditorRow.mobile}
          defaultMessage={defaultMsg}
          templateType="استئذان"
          templatePlaceholders={{ '{اسم_الطالب}': msgEditorRow.studentName, '{التاريخ}': hijriDate, '{السبب}': msgEditorRow.reason || '', '{المستلم}': msgEditorRow.receiver || '' }}
          onSend={(msg) => handleConfirmSend(msgEditorRow, msg)}
          onClose={() => setMsgEditorRow(null)}
        />;
      })()}
    </>
  );
};


// ============================================================
// Approved Tab
// ============================================================
const ApprovedTab: React.FC<{ records: PermissionRow[]; onRefresh: () => void; schoolSettings: Record<string, string> }> = ({ records, onRefresh, schoolSettings }) => {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailStudent, setDetailStudent] = useState<{ studentId: number; studentName: string } | null>(null);

  const studentGroups = useMemo(() => {
    let list = records;
    if (gradeFilter) list = list.filter((r) => r.grade === gradeFilter);
    if (classFilter) list = list.filter((r) => r.className === classFilter);
    if (reasonFilter) list = list.filter((r) => r.reason === reasonFilter);
    if (dateFrom) list = list.filter((r) => r.hijriDate >= dateFrom);
    if (dateTo) list = list.filter((r) => r.hijriDate <= dateTo);
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    const groups = new Map<number, { student: PermissionRow; records: PermissionRow[] }>();
    for (const r of list) { if (!groups.has(r.studentId)) groups.set(r.studentId, { student: r, records: [] }); groups.get(r.studentId)!.records.push(r); }
    return Array.from(groups.values()).sort((a, b) => b.records.length - a.records.length);
  }, [records, gradeFilter, classFilter, reasonFilter, dateFrom, dateTo, search]);

  const allFilteredRecords = useMemo(() => {
    let list = records;
    if (gradeFilter) list = list.filter((r) => r.grade === gradeFilter);
    if (classFilter) list = list.filter((r) => r.className === classFilter);
    if (reasonFilter) list = list.filter((r) => r.reason === reasonFilter);
    if (dateFrom) list = list.filter((r) => r.hijriDate >= dateFrom);
    if (dateTo) list = list.filter((r) => r.hijriDate <= dateTo);
    if (search) { const q = search.toLowerCase(); list = list.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    return list.sort((a, b) => `${a.grade}${a.className}`.localeCompare(`${b.grade}${b.className}`));
  }, [records, gradeFilter, classFilter, reasonFilter, dateFrom, dateTo, search]);

  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map((r) => r.grade)))), [records]);
  const classes = useMemo(() => sortClasses(Array.from(new Set(records.filter((r) => !gradeFilter || r.grade === gradeFilter).map((r) => r.className)))), [records, gradeFilter]);
  const reasons = useMemo(() => Array.from(new Set(records.map((r) => r.reason).filter(Boolean))).sort(), [records]);

  const handlePrintArchive = () => {
    if (allFilteredRecords.length === 0) { showError('لا يوجد بيانات للطباعة'); return; }
    printDailyReport('permissions', allFilteredRecords as unknown as Record<string, unknown>[], schoolSettings as any);
  };

  const handlePrintContactReport = () => {
    const sent = allFilteredRecords.filter((r) => r.isSent);
    if (sent.length === 0) { showError('لا يوجد سجلات تم إرسالها'); return; }
    printDailyReport('permissions', sent as unknown as Record<string, unknown>[], schoolSettings as any);
  };

  return (
    <>
      {/* أزرار — مطابق: تحديث + طباعة القائمة + تقرير التواصل */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={onRefresh} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>refresh</span> تحديث</button>
        <button onClick={handlePrintArchive} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>print</span> طباعة القائمة</button>
        <button onClick={handlePrintContactReport} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>contact_phone</span> تقرير التواصل</button>
      </div>

      {/* فلاتر */}
      <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم..."
            style={{ width: '180px', padding: '6px 12px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '13px' }} />
        <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setClassFilter(''); }}
            style={{ height: '34px', padding: '0 8px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px', background: '#f9fafb' }}>
            <option value="">كل الصفوف</option>{grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            style={{ height: '34px', padding: '0 8px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px', background: '#f9fafb' }}>
            <option value="">كل الفصول</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}
            style={{ height: '34px', padding: '0 8px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px', background: '#f9fafb' }}>
            <option value="">كل الأسباب</option>{reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <HijriDatePicker value={dateFrom} onChange={setDateFrom} placeholder="من تاريخ" accentColor="#0d9488" />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>إلى</span>
          <HijriDatePicker value={dateTo} onChange={setDateTo} placeholder="إلى تاريخ" accentColor="#0d9488" />
          <span style={{ fontSize: '11px', color: '#6b7280', marginRight: 'auto' }}>{allFilteredRecords.length} سجل</span>
          <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: '8px', padding: '2px' }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? '#fff' : 'transparent', color: viewMode === 'cards' ? '#7c3aed' : '#9ca3af', fontSize: '12px', fontWeight: 700 }}>بطاقات</button>
            <button onClick={() => setViewMode('table')} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#7c3aed' : '#9ca3af', fontSize: '12px', fontWeight: 700 }}>جدول</button>
          </div>
        </div>
      </div>

      {studentGroups.length === 0 ? (
        <EmptyState icon="search_off" title="لا توجد سجلات مطابقة" />
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {studentGroups.map(({ student, records: rList }) => {
            const total = rList.length;
            const borderColor = total >= 10 ? '#ef4444' : total >= 7 ? '#a78bfa' : total >= 5 ? '#fb923c' : total >= 3 ? '#fbbf24' : '#e5e7eb';
            const badge = total >= 10 ? 'متكرر جداً' : total >= 7 ? 'متكرر' : total >= 5 ? 'ملاحظ' : total >= 3 ? 'تنبيه' : '';
            const badgeBg = total >= 10 ? '#dc2626' : total >= 7 ? '#f3e8ff' : total >= 5 ? '#fff7ed' : total >= 3 ? '#fefce8' : '';
            const badgeColor = total >= 10 ? '#fff' : total >= 7 ? '#6b21a8' : total >= 5 ? '#9a3412' : total >= 3 ? '#854d0e' : '';
            // تصنيف حسب السبب
            const reasons: Record<string, number> = {};
            rList.forEach((r) => { const k = r.reason || 'غير محدد'; reasons[k] = (reasons[k] || 0) + 1; });
            const reasonColors: Record<string, string> = { 'مرض': '#dc2626', 'مراجعة طبية': '#dc2626', 'ظرف صحي': '#dc2626', 'ظروف عائلية': '#2563eb', 'ظرف أسري': '#2563eb', 'مراجعة حكومية': '#d97706', 'موعد حكومي': '#d97706', 'طلب ولي الأمر': '#7c3aed', 'أخرى': '#6b7280' };

            return (
              <div key={student.studentId} onClick={() => setDetailStudent({ studentId: student.studentId, studentName: student.studentName })}
                style={{ background: '#fff', borderRadius: '12px', border: `2px solid ${borderColor}`, padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: total >= 7 ? '#dc2626' : total >= 4 ? '#7c3aed' : '#4b5563' }}>{total}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>استئذان</span>
                  </div>
                  {badge && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: badgeBg, color: badgeColor }}>{badge}</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>{student.studentName}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', marginBottom: '10px' }}>{student.grade} / {classToLetter(student.className)}</div>
                {/* أسباب */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' }}>
                  {Object.entries(reasons).map(([reason, count]) => {
                    const c = reasonColors[reason] || '#6b7280';
                    return <div key={reason} style={{ flex: '1 1 60px', textAlign: 'center', borderRadius: '8px', padding: '6px 4px', background: `${c}10`, border: `1px solid ${c}30` }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: c }}>{count}</div>
                      <div style={{ fontSize: '8px', color: `${c}cc`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reason}</div>
                    </div>;
                  })}
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#7c3aed', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{fontSize:14}}>open_in_new</span> عرض التفاصيل</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>الطالب</th><th>الصف</th><th>العدد</th><th>مؤكد</th><th>بانتظار</th><th style={{ textAlign: 'center' }}>تفاصيل</th></tr></thead>
            <tbody>
              {studentGroups.map(({ student, records: rList }) => (
                <tr key={student.studentId}>
                  <td style={{ fontWeight: 700 }}>{student.studentName}</td>
                  <td>{student.grade} ({classToLetter(student.className)})</td>
                  <td style={{ fontWeight: 700, color: '#7c3aed' }}>{rList.length}</td>
                  <td>{rList.filter((r) => r.confirmationTime).length}</td>
                  <td>{rList.filter((r) => !r.confirmationTime).length}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => setDetailStudent({ studentId: student.studentId, studentName: student.studentName })}
                      style={{ padding: '4px 12px', background: '#f5f3ff', color: '#7c3aed', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>عرض</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailStudent && (
        <StudentDetailModal studentName={detailStudent.studentName} records={records.filter((r) => r.studentId === detailStudent.studentId)} onClose={() => setDetailStudent(null)} onRefresh={onRefresh} schoolSettings={schoolSettings} />
      )}
    </>
  );
};

// ============================================================
// Student Detail Modal
// ============================================================
const StudentDetailModal: React.FC<{ studentName: string; records: PermissionRow[]; onClose: () => void; onRefresh: () => void; schoolSettings: Record<string, string> }> = ({ studentName, records, onClose, onRefresh, schoolSettings }) => {
  const handleSendAll = async () => {
    const unsent = records.filter((r) => !r.isSent);
    if (unsent.length === 0) { showError('جميع السجلات تم إرسالها'); return; }
    try { const res = await permissionsApi.sendWhatsAppBulk(unsent.map((r) => r.id)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount}`); onRefresh(); } } catch { showError('خطأ'); }
  };

  const handlePrint = () => {
    if (records.length === 0) { showError('لا يوجد بيانات'); return; }
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = records.map((r, i) => ({ cells: [
      toIndic(i + 1),
      toIndic(r.hijriDate || '-'),
      toIndic(r.exitTime || '-'),
      `<span style="font-size:12pt">${escapeHtml(r.reason || '-')}</span>`,
      escapeHtml(r.receiver || '-'),
      r.confirmationTime ? `<span style="color:#15803d;font-weight:bold">${toIndic(r.confirmationTime)}</span>` : '<span style="color:#999">-</span>',
      r.isSent ? '<span style="color:green;font-weight:bold">تم</span>' : '<span style="color:#999">لا</span>',
    ] }));
    printListReport({
      title: `سجل الاستئذان — ${studentName}`,
      dateText: `${hijri} | الإجمالي: ${toIndic(records.length)}`,
      headers: [
        { label: 'م', width: '5%' }, { label: 'التاريخ', width: '15%' }, { label: 'وقت الخروج', width: '12%' },
        { label: 'السبب', width: '20%' }, { label: 'المستلم', width: '15%' }, { label: 'التأكيد', width: '13%' }, { label: 'الإرسال', width: '8%' },
      ],
      rows,
      summary: `إجمالي: ${toIndic(records.length)} استئذان`,
    }, schoolSettings as any);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'linear-gradient(to left, #f5f3ff, #ede9fe)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{studentName}</h3><span style={{ fontSize: '14px', color: '#6b7280' }}>إجمالي الاستئذان: <strong>{records.length}</strong></span></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSendAll} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> إرسال الكل</button>
            <button onClick={handlePrint} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>print</span> طباعة</button>
            <button onClick={onClose} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span></button>
          </div>
        </div>
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <table className="data-table">
            <thead><tr><th>التاريخ</th><th>وقت الخروج</th><th>السبب</th><th>المستلم</th><th>التأكيد</th><th>الإرسال</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: '13px' }}>{r.hijriDate}</td>
                  <td>{r.exitTime}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed' }}>{r.reason}</span></td>
                  <td>{r.receiver || '-'}</td>
                  <td>{r.confirmationTime ? <span style={{ color: '#15803d' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle',color:'#15803d'}}>check_circle</span> {r.confirmationTime}</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                  <td>{r.isSent ? <span style={{ color: '#15803d' }}><span className="material-symbols-outlined" style={{fontSize:16,color:'#15803d'}}>check_circle</span></span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Reports Tab
// ============================================================
const ReportsTab: React.FC<{ records: PermissionRow[]; schoolSettings: Record<string, string> }> = ({ records, schoolSettings }) => {
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map((r) => r.grade)))), [records]);
  const classes = useMemo(() => sortClasses(Array.from(new Set(records.filter((r) => !gradeFilter || r.grade === gradeFilter).map((r) => r.className)))), [records, gradeFilter]);

  const filtered = useMemo(() => {
    let list = records;
    if (gradeFilter) list = list.filter((r) => r.grade === gradeFilter);
    if (classFilter) list = list.filter((r) => r.className === classFilter);
    return list;
  }, [records, gradeFilter, classFilter]);

  const uniqueStudents = useMemo(() => new Set(filtered.map((r) => r.studentId)).size, [filtered]);

  const topStudents = useMemo(() => {
    const g = new Map<number, { name: string; grade: string; cls: string; count: number }>();
    for (const r of filtered) { const x = g.get(r.studentId) || { name: r.studentName, grade: r.grade, cls: classToLetter(r.className), count: 0 }; x.count++; g.set(r.studentId, x); }
    return Array.from(g.entries()).map(([id, x]) => ({ id, ...x })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const byReason = useMemo(() => {
    const g = new Map<string, number>();
    for (const r of filtered) { const key = r.reason || 'غير محدد'; g.set(key, (g.get(key) || 0) + 1); }
    return Array.from(g.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const byClass = useMemo(() => {
    const g = new Map<string, number>();
    for (const r of filtered) { const key = `${r.grade} (${classToLetter(r.className)})`; g.set(key, (g.get(key) || 0) + 1); }
    return Array.from(g.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const maxByReason = Math.max(...byReason.map((r) => r.count), 1);

  const handlePrint = () => {
    if (topStudents.length === 0) { showError('لا يوجد بيانات'); return; }
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = topStudents.map((s, i) => ({ cells: [
      toIndic(i + 1),
      `<span style="font-weight:bold">${escapeHtml(s.name)}</span>`,
      toIndic(escapeHtml(`${s.grade} (${s.cls})`)),
      `<span style="font-weight:bold;color:#7c3aed">${toIndic(s.count)}</span>`,
    ] }));
    printListReport({
      title: 'تقرير الاستئذان — أكثر الطلاب استئذاناً',
      dateText: `${hijri} | الإجمالي: ${toIndic(filtered.length)}`,
      headers: [
        { label: 'م', width: '8%' }, { label: 'الطالب', width: '40%' }, { label: 'الصف', width: '25%' }, { label: 'العدد', width: '15%' },
      ],
      rows,
      summary: `إجمالي الاستئذان: ${toIndic(filtered.length)} | عدد الطلاب: ${toIndic(uniqueStudents)}`,
    }, schoolSettings as any);
  };

  const sentCount = filtered.filter((r) => r.isSent).length;

  return (
    <>
      {/* فلاتر — مطابق للقديم: صف + فصل + تحديث */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>الصف</label>
            <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setClassFilter(''); }} style={{ width: '160px', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}><option value="">كل الصفوف</option>{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>الفصل</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} disabled={!gradeFilter} style={{ width: '120px', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: gradeFilter ? '#fff' : '#f9fafb' }}><option value="">كل الفصول</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <button onClick={handlePrint} style={btnOutline('#0891b2')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>print</span> طباعة التقرير</button>
        </div>
      </div>

      {/* 4 بطاقات إحصائية — مطابق للقديم */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {([
          { label: 'إجمالي الاستئذان', value: filtered.length, color: '#7c3aed', borderColor: '#a78bfa' },
          { label: 'عدد الطلاب', value: uniqueStudents, color: '#2563eb', borderColor: '#60a5fa' },
          { label: 'تم إرسالها', value: sentCount, color: '#16a34a', borderColor: '#4ade80' },
          { label: 'لم تُرسل', value: filtered.length - sentCount, color: '#ea580c', borderColor: '#fb923c' },
        ] as const).map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', borderRight: `4px solid ${s.borderColor}` }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, marginBottom: '2px' }}>{s.value}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* رسمين بيانيين — مطابق للقديم: أكثر الطلاب + حسب السبب */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* أكثر الطلاب استئذاناً */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#faf5ff' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-outlined" style={{fontSize:18,color:'#7c3aed'}}>trending_up</span> أكثر الطلاب استئذاناً</h4>
          </div>
          <div style={{ padding: '12px' }}>
            {topStudents.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>لا توجد بيانات</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {topStudents.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '8px', background: i < 3 ? '#faf5ff' : '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: i < 3 ? '#7c3aed' : '#d1d5db', color: i < 3 ? '#fff' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{i + 1}</span>
                      <div><span style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</span><span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '6px' }}>{s.grade} {s.cls}</span></div>
                    </div>
                    <span style={{ padding: '2px 8px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>{s.count} مرة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* حسب السبب */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fffbeb' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-outlined" style={{fontSize:18,color:'#d97706'}}>pie_chart</span> حسب السبب</h4>
          </div>
          <div style={{ padding: '16px' }}>
            {byReason.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>لا توجد بيانات</p> : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {byReason.map((r, i) => {
                  const colors = ['#7c3aed', '#2563eb', '#d97706', '#e11d48', '#0d9488', '#4f46e5'];
                  const c = colors[i % colors.length];
                  const pct = filtered.length > 0 ? Math.round((r.count / filtered.length) * 100) : 0;
                  return <div key={r.reason} style={{ textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '12px', minWidth: '80px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: c, marginBottom: '2px' }}>{r.count}</div>
                    <div style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>{r.reason}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{pct}%</div>
                  </div>;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================
// Shared Components
// ============================================================


const ConfirmModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ title, message, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
    <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '400px', padding: '24px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: '0 0 24px', color: '#4b5563' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={onConfirm} style={{ padding: '8px 24px', background: '#dc2626', color: '#fff', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>تأكيد</button>
      </div>
    </div>
  </div>
);

// ============================================================
// Add Permission Modal
// ============================================================
const RECEIVERS = ['الأب', 'الأخ', 'الأم', 'الجد', 'العم', 'آخر'];
const RESPONSIBLES = ['الموجه الطلابي', 'الوكيل', 'المدير'];

const AddPermissionModal: React.FC<{ stages: StageConfigData[]; onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [exitTime, setExitTime] = useState('');
  const [reason, setReason] = useState('');
  const [receiver, setReceiver] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selectedStudents.length === 0) return showError('اختر طالب واحد على الأقل');
    if (!reason) return showError('يرجى اختيار السبب');
    if (!receiver) return showError('يرجى اختيار المستلم');
    if (!supervisor) return showError('يرجى اختيار المسؤول');
    setSaving(true);
    try {
      const ids = selectedStudents.map((s) => s.id);
      if (ids.length === 1) {
        const data: PermissionData = { studentId: ids[0], exitTime, reason, receiver, supervisor };
        const res = await permissionsApi.add(data);
        if (res.data?.success) { showSuccess('تم تسجيل الاستئذان'); onSaved(); } else showError(res.data?.message || 'فشل');
      } else {
        const res = await permissionsApi.addBatch(ids, { exitTime, reason, receiver, supervisor });
        if (res.data?.data) { showSuccess(res.data.data.message || 'تم'); onSaved(); } else showError(res.data?.message || 'فشل');
      }
    } catch { showError('فشل التسجيل'); }
    finally { setSaving(false); }
  };

  const fldStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' };
  const fldLabel: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 };

  return (
    <InputModal
      title="تسجيل استئذان"
      icon="exit_to_app"
      headerBg="linear-gradient(to left, #0891b2, #06b6d4)"
      accentColor="#0891b2"
      saveLabel="حفظ"
      counterText={`${selectedStudents.length} طالب محدد`}
      saving={saving}
      onClose={onClose}
      onSave={handleSave}
    >
      <StudentSelector
        onSelectionChange={setSelectedStudents}
        accentColor="#0891b2"
        accentBg="#ecfeff"
      />
      {/* وقت الخروج + السبب */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={fldLabel}>وقت الخروج</label>
          <input type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} style={fldStyle} />
        </div>
        <div>
          <label style={fldLabel}>السبب *</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={fldStyle}>
            <option value="">اختر السبب</option>
            {PERMISSION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      {/* المستلم + المسؤول */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={fldLabel}>المستلم *</label>
          <select value={receiver} onChange={(e) => setReceiver(e.target.value)} style={fldStyle}>
            <option value="">اختر المستلم</option>
            {RECEIVERS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={fldLabel}>المسؤول *</label>
          <select value={supervisor} onChange={(e) => setSupervisor(e.target.value)} style={fldStyle}>
            <option value="">اختر المسؤول</option>
            {RESPONSIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </InputModal>
  );
};

export default PermissionsPage;
