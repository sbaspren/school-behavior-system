// ===== Core print utilities =====
// Re-exports from printUtils.ts (the original location).
// New code should import from here; printUtils.ts is kept for
// backward-compatibility only.

export {
  toIndic,
  escapeHtml,
  classToLetter,
  tardinessTypeLabel,
  shortenName,
  shortenStudentName,
  formatClass,
  openPrintWindow,
  getTodayDates,
  extractTime,
  cleanGradeName,
  detectStageFromGrade,
  arabicToWesternNumerals,
  normalizeArabicForMatch,
  adjustFontSize,
  adjustAllFields,
  sortGrades,
  sortByClass,
  sortByGradeClass,
} from '../printUtils';
