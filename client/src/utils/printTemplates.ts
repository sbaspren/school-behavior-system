// ===== printTemplates.ts — BARREL FILE =====
// This file has been split into modular files under ./print/.
// All existing imports continue to work via this barrel re-export.
// New code should import directly from './print' or its sub-modules.

export {
  printForm,
  printListReport,
  printSingleDetail,
  FORM_NAMES,
} from './print';

export type {
  PrintFormData,
  FormId,
  ListReportRow,
  ListReportConfig,
  ReportSection,
  SingleDetailConfig,
} from './print';
