/**
 * أنماط موحدة لصفحات النماذج العامة (الجوال)
 * تتوافق مع لغة التصميم الرئيسية للدسكتوب (App.css)
 * الخط: Cairo | الخلفية: #f4f5f9 | أيقونات: Material Symbols فقط
 */
import type { CSSProperties } from 'react';

/* ═══ ثوابت التصميم ═══ */
const COLORS = {
  bg: '#f4f5f9',
  surface: '#ffffff',
  surfaceHover: '#fafbfe',
  border: '#e8ebf2',
  borderLight: '#f0f2f7',
  text: '#1a1d2e',
  textSecondary: '#5c6178',
  textMuted: '#9da3b8',
  primary: '#4f46e5',
  primaryLight: '#eef2ff',
  danger: '#ef4444',
  success: '#10b981',
  successLight: '#ecfdf5',
  dangerLight: '#fef2f2',
  disabled: '#d1d5db',
};

const FONT = "'Cairo', 'IBM Plex Sans Arabic', sans-serif";
const R_SM = '8px';
const R_MD = '12px';
const R_LG = '16px';
const SHADOW_SM = '0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03)';
const SHADOW_MD = '0 4px 12px rgba(0,0,0,.06)';

/* ═══ الأنماط المشتركة ═══ */
export const MF: Record<string, CSSProperties> = {
  /* ── الصفحة ── */
  page: {
    direction: 'rtl',
    fontFamily: FONT,
    background: COLORS.bg,
    minHeight: '100vh',
    color: COLORS.text,
    WebkitTapHighlightColor: 'transparent',
  },

  /* ── شاشة التحميل ── */
  loadingPage: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', fontFamily: FONT, gap: '12px',
  },
  loadingText: { fontSize: '15px', color: COLORS.textMuted, fontWeight: 600 },

  /* ── شاشة الخطأ ── */
  errorPage: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', fontFamily: FONT, textAlign: 'center', padding: '32px',
  },
  errorIcon: { fontSize: '48px', marginBottom: '16px', color: COLORS.textMuted },
  errorTitle: { fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: COLORS.text },
  errorMsg: { color: COLORS.textSecondary, fontSize: '14px' },

  /* ── الشريط الملون العلوي ── */
  accentStrip: { height: '4px' },

  /* ── الهيدر ── */
  header: {
    background: COLORS.surface,
    padding: '14px 20px',
    borderBottom: `1px solid ${COLORS.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  headerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    maxWidth: '600px', margin: '0 auto',
  },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerIcon: {
    width: '40px', height: '40px', borderRadius: R_MD,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: { fontSize: '17px', fontWeight: 800, color: COLORS.text, margin: 0 },
  headerSub: { fontSize: '12px', color: COLORS.textSecondary, marginTop: '1px' },

  /* ── زر التحديث ── */
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '7px 14px', background: COLORS.bg,
    border: `1.5px solid ${COLORS.border}`, borderRadius: R_SM,
    color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', fontFamily: FONT,
  },

  /* ── شريط التبويبات ── */
  tabsBar: {
    margin: '12px 16px', background: '#fff', borderRadius: R_LG,
    padding: '5px', display: 'flex', gap: '3px',
    boxShadow: SHADOW_SM, border: `1px solid ${COLORS.borderLight}`,
    overflowX: 'auto',
    maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto',
  },
  tab: {
    flex: 1, padding: '9px 6px', borderRadius: R_MD,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    color: '#888', border: 'none', background: 'none',
    fontFamily: FONT, whiteSpace: 'nowrap',
    transition: 'all .25s',
  },
  tabActive: { color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.15)' },

  /* ── المحتوى ── */
  content: { maxWidth: '600px', margin: '0 auto', padding: '4px 16px 90px' },

  /* ── البطاقات ── */
  card: {
    background: COLORS.surface,
    borderRadius: R_MD,
    border: `1px solid ${COLORS.border}`,
    boxShadow: SHADOW_SM,
    marginBottom: '12px',
    overflow: 'hidden',
  },
  cardAccent: { height: '3px' },
  cardBody: { padding: '16px' },
  cardTitle: {
    fontSize: '13px', fontWeight: 700, color: COLORS.text,
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px',
  },

  /* ── حقول الإدخال ── */
  selectGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  selectGrid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  selectLabel: { fontSize: '11px', fontWeight: 700, color: COLORS.textMuted, marginBottom: '4px' },
  select: {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${COLORS.border}`, borderRadius: R_SM,
    fontSize: '13px', fontWeight: 600, fontFamily: FONT,
    background: COLORS.surface, color: COLORS.text,
  },
  searchBox: { position: 'relative' as const, marginBottom: '8px' },
  searchIcon: {
    position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '18px', color: COLORS.textMuted,
  },
  searchInput: {
    width: '100%', padding: '10px 12px', paddingRight: '38px',
    border: `1.5px solid ${COLORS.border}`, borderRadius: R_SM,
    fontSize: '13px', fontFamily: FONT,
    background: COLORS.surface, color: COLORS.text,
    boxSizing: 'border-box' as const,
  },

  /* ── الحبوب (Pills) ── */
  pillRow: { display: 'flex', gap: '4px', marginBottom: '10px' },
  pill: {
    padding: '6px 14px', borderRadius: '100px', border: 'none',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT, background: '#f5f5f5', color: '#666',
    display: 'flex', alignItems: 'center', gap: '4px',
    transition: 'all .2s',
  },
  pillActive: { color: '#fff' },

  /* ── القوائم ── */
  scrollList: { maxHeight: '280px', overflowY: 'auto' as const },
  listItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderBottom: `1px solid ${COLORS.borderLight}`,
    cursor: 'pointer', fontSize: '13px',
    borderRight: `4px solid ${COLORS.borderLight}`,
    transition: 'background .15s',
  },
  listItemSelected: { borderRightColor: COLORS.danger },
  degreeBadge: {
    padding: '3px 10px', borderRadius: R_SM, fontSize: '11px', fontWeight: 700,
    whiteSpace: 'nowrap' as const,
  },

  /* ── اختيار الطلاب ── */
  studentHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '10px',
  },
  studentHeaderTitle: {
    fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
  },
  countBadge: {
    padding: '2px 10px', borderRadius: '100px', fontSize: '11px',
    fontWeight: 800, color: '#fff',
  },
  selectAllBtn: {
    padding: '6px 12px', borderRadius: R_SM,
    border: `1px solid ${COLORS.border}`, background: '#fff',
    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT, color: COLORS.textSecondary,
  },

  /* ── شرائح الطلاب المختارين ── */
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', margin: '8px 0' },
  chip: {
    padding: '5px 12px', borderRadius: '100px', fontSize: '12px',
    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
    cursor: 'pointer',
  },

  /* ── عناصر الطلاب ── */
  studentItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderBottom: `1px solid ${COLORS.borderLight}`,
    cursor: 'pointer', transition: 'background .15s',
  },
  checkbox: {
    width: '20px', height: '20px', borderRadius: '6px',
    border: `2px solid ${COLORS.border}`, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', color: '#fff', flexShrink: 0,
    transition: 'all .15s',
  },
  checkboxOn: { borderColor: 'transparent' },
  studentName: { fontSize: '14px', fontWeight: 600, flex: 1 },
  studentClass: {
    fontSize: '10px', fontWeight: 700, padding: '3px 8px',
    borderRadius: R_SM, background: COLORS.bg, color: COLORS.textMuted,
  },

  /* ── الشريط السفلي ── */
  bottomBar: {
    position: 'fixed' as const, bottom: 0, left: 0, right: 0,
    display: 'flex', gap: '8px', padding: '12px 16px',
    background: COLORS.surface,
    borderTop: `1px solid ${COLORS.border}`,
    boxShadow: '0 -4px 12px rgba(0,0,0,.04)', zIndex: 40,
    maxWidth: '600px', margin: '0 auto',
  },
  submitBtn: {
    flex: 1, padding: '14px', border: 'none', borderRadius: R_MD,
    color: '#fff', fontSize: '15px', fontWeight: 700,
    fontFamily: FONT, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
  logBtn: {
    padding: '14px 18px', border: `1.5px solid ${COLORS.border}`,
    borderRadius: R_MD, background: '#fff',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    fontFamily: FONT, color: COLORS.textSecondary,
    display: 'flex', alignItems: 'center', gap: '4px',
  },

  /* ── التوست ── */
  toast: {
    position: 'fixed' as const, top: '80px', left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px', borderRadius: R_MD, color: '#fff',
    fontSize: '14px', fontWeight: 700, zIndex: 60,
    textAlign: 'center' as const, minWidth: '200px',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)',
    display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
  },
  toastSuccess: { background: COLORS.success },
  toastError: { background: COLORS.danger },

  /* ── الرسائل (inline) ── */
  msgSuccess: {
    margin: '8px 0', padding: '10px 16px', borderRadius: R_SM,
    background: COLORS.successLight, color: '#065f46',
    fontSize: '13px', fontWeight: 600, textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
  },
  msgError: {
    margin: '8px 0', padding: '10px 16px', borderRadius: R_SM,
    background: COLORS.dangerLight, color: '#991b1b',
    fontSize: '13px', fontWeight: 600, textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
  },

  /* ── النافذة المنبثقة (Bottom Sheet) ── */
  overlay: {
    position: 'fixed' as const, inset: 0,
    background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: COLORS.surface, borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: '600px', maxHeight: '70vh',
    display: 'flex', flexDirection: 'column' as const,
  },
  modalHandle: {
    width: '40px', height: '4px', background: COLORS.disabled,
    borderRadius: '100px', margin: '10px auto',
  },
  modalHeader: {
    padding: '0 20px 14px', borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px',
  },
  modalClose: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: 'none', background: COLORS.bg, fontSize: '18px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT, color: COLORS.textSecondary,
  },
  modalBody: { flex: 1, overflowY: 'auto' as const, padding: '16px 20px' },

  /* ── السجل ── */
  logStageHeader: {
    fontSize: '13px', fontWeight: 800, color: COLORS.textSecondary,
    padding: '8px 12px', background: COLORS.bg, borderRadius: R_SM,
    margin: '12px 0 8px', textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
  logItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: `1px solid ${COLORS.borderLight}`,
  },
  logName: { fontSize: '14px', fontWeight: 700 },
  logBadge: {
    fontSize: '11px', fontWeight: 700, padding: '4px 10px',
    borderRadius: '100px', color: '#fff',
  },

  /* ── الحالة الفارغة ── */
  empty: {
    textAlign: 'center' as const, padding: '40px 20px',
    color: COLORS.textMuted, fontSize: '14px',
  },

  /* ── textarea ── */
  textarea: {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${COLORS.border}`, borderRadius: R_SM,
    fontSize: '13px', fontFamily: FONT,
    marginTop: '8px', boxSizing: 'border-box' as const,
    resize: 'vertical' as const, color: COLORS.text,
  },
};

/* ═══ ألوان الأقسام ═══ */
export const SEC_COLORS = {
  violations: '#ef4444',
  absence: '#f59e0b',
  positive: '#22c55e',
  notes: '#06b6d4',
  permission: '#3b82f6',
  tardiness: '#f97316',
  guard: '#1e3a5f',
  parent: '#16a34a',
  counselor: '#7c3aed',
  wakeel: '#4f46e5',
  staff: '#3b82f6',
  teacher: '#6366f1',
};

/* ═══ أيقونات الأقسام ═══ */
export const SEC_ICONS: Record<string, string> = {
  violations: 'gavel',
  absence: 'event_busy',
  positive: 'star',
  notes: 'menu_book',
  permission: 'door_front',
  tardiness: 'schedule',
};

/* ═══ ألوان الهيدر حسب الدور ═══ */
export const ROLE_THEME: Record<string, { color: string; icon: string; bg: string }> = {
  wakeel:    { color: SEC_COLORS.wakeel,    icon: 'badge',        bg: '#eef2ff' },
  staff:     { color: SEC_COLORS.staff,     icon: 'shield_person',bg: '#eff6ff' },
  counselor: { color: SEC_COLORS.counselor, icon: 'psychology',   bg: '#f5f3ff' },
  teacher:   { color: SEC_COLORS.teacher,   icon: 'school',       bg: '#eef2ff' },
  guard:     { color: SEC_COLORS.guard,     icon: 'security',     bg: '#e8edf4' },
  parent:    { color: SEC_COLORS.parent,    icon: 'family_restroom', bg: '#ecfdf5' },
};

export default MF;
