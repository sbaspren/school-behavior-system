// ===== Shared print types, interfaces, constants and internal helpers =====
import { toIndic, escapeHtml } from '../printUtils';

// ===== Data interfaces =====
export interface PrintFormData {
  studentName?: string;
  grade?: string;
  class?: string;
  violationDay?: string;
  violationDate?: string;
  violationDegree?: string | number;
  violationText?: string;
  managerName?: string;
  deputyName?: string;
  counselorName?: string;
  procedures?: string[];
  committeeMembers?: { name: string; role: string }[];
  // invitation
  visitDay?: string;
  visitDate?: string;
  visitTime?: string;
  visitMeeting?: string;
  visitReason?: string;
  // mahdar
  mahdarLocation?: string;
  mahdarObservations?: string[];
  mahdarWitnesses?: { name: string; role: string }[];
  // committee
  lajnahPrevProcedures?: string;
  lajnahRecommendations?: string;
  // absence
  unexcusedDays?: string | number;
  excusedDays?: string | number;
  // group referral / group pledge
  studentsList?: { name: string; grade?: string; cls?: string; unexcused?: number; excused?: number }[];
  // behavioral tracking
  violationsList?: { description: string; degree: number; date: string; procedures: string }[];
  // grade compensation
  violationInfo?: { name: string; degree: string; date: string; points: string };
  // high risk
  riskTypes?: string[];
  riskDesc?: string;
  riskObserver?: string;
  riskDate?: string;
  riskTime?: string;
  // abuse report
  eblaghReporter?: string;
  eblaghRole?: string;
  eblaghSummary?: string;
  eblaghProcedures?: string[];
  // behavior modification plan
  khotaDob?: string;
  khotaAge?: string;
  khotaStart?: string;
  khotaEnd?: string;
  khotaProblem?: string;
  khotaDegree?: string;
  khotaDesc?: string;
  khotaManifestations?: string[];
  // teacher tracking
  subject?: string;
  teacherName?: string;
  violations?: { studentName: string; violation: string; action: string; date: string }[];
  // fight
  day?: string;
  date?: string;
  time?: string;
  location?: string;
  initiator?: string;
  description?: string;
  physicalDamage?: string[] | string;
  materialDamage?: string[] | string;
  involvedStudents?: { name: string; grade: string; role: string }[];
  witnesses?: string[];
  authors?: { name: string; role: string }[];
  students?: { name: string; grade: string }[];
  authorName?: string;
  authorRole?: string;
  // communication documentation
  contactDay?: string;
  contactDate?: string;
  contactType?: string;
  contactReason?: string;
  contactResult?: string;
  contactNotes?: string;
  notes?: string;
}

export interface SchoolSettings {
  letterheadMode: string;
  letterheadImageUrl?: string;
  schoolName?: string;
  eduAdmin?: string;
  eduDept?: string;
  letterhead?: string;
}

// ===== Form IDs =====
export type FormId =
  | 'ishar_wali_amr' | 'tahood_slooki' | 'dawat_wali_amr' | 'mahdar_dab_wakea'
  | 'mahdar_lajnah' | 'mahdar_lajnah_absence' | 'ehalat_talib' | 'group_ehala'
  | 'rasd_slooki' | 'tawid_darajat' | 'rasd_tamayuz' | 'ghiab_bidon_ozr'
  | 'ghiab_ozr' | 'tahood_hodoor' | 'group_tahood' | 'iltizam_madrasi'
  | 'rasd_moalem' | 'high_risk' | 'eblagh_etha' | 'khota_tadeel'
  | 'ehalat_absence' | 'tawtheeq_tawasol' | 'mashajara';

// ===== Form names =====
export const FORM_NAMES: Record<FormId, string> = {
  ishar_wali_amr: 'إشعار ولي أمر',
  tahood_slooki: 'تعهد سلوكي',
  dawat_wali_amr: 'دعوة ولي أمر',
  mahdar_dab_wakea: 'محضر ضبط واقعة',
  mahdar_lajnah: 'محضر لجنة (مخالفة)',
  mahdar_lajnah_absence: 'محضر لجنة (غياب)',
  ehalat_talib: 'إحالة طالب',
  group_ehala: 'إحالة جماعية',
  rasd_slooki: 'رصد مخالفات سلوكية',
  tawid_darajat: 'تعويض درجات',
  rasd_tamayuz: 'رصد تمايز',
  ghiab_bidon_ozr: 'غياب بدون عذر',
  ghiab_ozr: 'غياب بعذر',
  tahood_hodoor: 'تعهد حضور',
  group_tahood: 'تعهد جماعي',
  iltizam_madrasi: 'التزام مدرسي',
  rasd_moalem: 'رصد معلم',
  high_risk: 'حالة عالية الخطورة',
  eblagh_etha: 'إبلاغ إيذاء',
  khota_tadeel: 'خطة تعديل سلوك',
  ehalat_absence: 'إحالة غياب',
  tawtheeq_tawasol: 'توثيق تواصل',
  mashajara: 'محضر مشاجرة',
};

// ===== List report types =====
export interface ListReportRow {
  cells: string[];
  isSeparator?: boolean;
  isGroupHeader?: boolean;
  groupLabel?: string;
  groupCount?: number;
}

/** قسم مستقل بجدول وترويسة خاصة — لتقارير متعددة الأقسام */
export interface ReportSection {
  title: string;
  headers: { label: string; width?: string }[];
  rows: ListReportRow[];
}

export interface ListReportConfig {
  title: string;
  subtitle?: string;
  dateText: string;
  statsBar?: string;
  /** أعمدة الجدول الموحّد (تُستخدم إذا لم تُحدد sections) */
  headers: { label: string; width?: string }[];
  /** صفوف الجدول الموحّد (تُستخدم إذا لم تُحدد sections) */
  rows: ListReportRow[];
  /** أقسام مستقلة — كل قسم بجدوله وأعمدته (تتجاهل headers/rows أعلاه) */
  sections?: ReportSection[];
  summary?: string;
  signatures?: boolean;
}

export interface SingleDetailConfig {
  title: string;
  fields: { label: string; value: string; ltr?: boolean }[];
  messageTitle?: string;
  messageBody?: string;
  dateText: string;
}

// ===== Internal helpers (used by form templates and printForm) =====

/** Fill a single field in the document by id */
export function fillField(doc: Document, id: string, value: string | number | undefined, indicNum = false): void {
  const el = doc.getElementById(id);
  if (!el || value === undefined || value === null) return;
  let text = String(value);
  if (indicNum) text = toIndic(text);
  el.textContent = text;
}

/** Fill committee members table */
export function fillCommitteeMembers(doc: Document, tableId: string, members?: { name: string; role: string }[]): void {
  if (!members || members.length === 0) return;
  const tbody = doc.getElementById(tableId);
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  members.forEach((m, i) => {
    if (i < rows.length) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 3) {
        cells[1].textContent = m.name;
        cells[2].textContent = m.role;
      }
    }
  });
}

/** Build empty table rows */
export function emptyRows(count: number, cols: number): string {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += '<tr>';
    html += `<td class="indic-num">${toIndic(i + 1)}</td>`;
    for (let c = 1; c < cols; c++) html += '<td></td>';
    html += '</tr>';
  }
  return html;
}
