// ═══ أنواع مشتركة — تُستخدم عبر كل الصفحات ═══

/** خيار طالب — يُستخدم في كل نوافذ اختيار الطلاب */
export interface StudentOption {
  id: number;
  studentNumber: string;
  name: string;
  stage: string;
  grade: string;
  className: string;
  mobile?: string;
}

/** حقول مشتركة بين كل أنواع السجلات */
export interface BaseRecord {
  id: number;
  studentId: number;
  studentNumber: string;
  studentName: string;
  grade: string;
  className: string;
  stage: string;
  recordedAt: string;
  isSent: boolean;
  notes?: string;
}

/** سجل مخالفة */
export interface ViolationRow extends BaseRecord {
  violationCode: string;
  description: string;
  type: string;
  degree: number;
  hijriDate: string;
  miladiDate: string;
  deduction: number;
  procedures: string;
  recordedBy: string;
  mobile?: string;
}

/** سجل غياب */
export interface AbsenceRow extends BaseRecord {
  mobile: string;
  absenceType: string;
  period: string;
  hijriDate: string;
  dayName: string;
  recordedBy: string;
  status: string;
  excuseType: string;
  tardinessStatus: string;
  arrivalTime: string;
}

/** سجل تراكمي للغياب */
export interface CumulativeRow {
  studentId: number;
  studentNumber: string;
  studentName: string;
  grade: string;
  className: string;
  stage: string;
  excusedDays: number;
  unexcusedDays: number;
  lateDays: number;
  totalDays: number;
}

/** سجل تأخر */
export interface TardinessRow extends BaseRecord {
  mobile: string;
  tardinessType: string;
  period: string;
  hijriDate: string;
  recordedBy: string;
}

/** سجل استئذان */
export interface PermissionRow extends BaseRecord {
  mobile: string;
  exitTime: string;
  reason: string;
  receiver: string;
  supervisor: string;
  hijriDate: string;
  recordedBy: string;
  confirmationTime: string;
}

/** سجل سلوك متمايز */
export interface BehaviorRow extends BaseRecord {
  behaviorType: string;
  degree: string;
  details: string;
  hijriDate: string;
  recordedBy: string;
}

/** سجل ملاحظة تربوية */
export interface NoteRow extends BaseRecord {
  mobile: string;
  noteType: string;
  details: string;
  teacherName: string;
  hijriDate: string;
}

/** إحصائيات يومية مشتركة */
export interface DailyStats {
  todayCount: number;
  totalCount?: number;
  unsentCount?: number;
  sentCount?: number;
  uniqueStudents?: number;
  totalDegrees?: number;
  totalRecords?: number;
}
