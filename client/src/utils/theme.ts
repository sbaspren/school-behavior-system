// ═══ نظام التصميم — Design Tokens ═══

export const colors = {
  primary: { DEFAULT: '#4f46e5', light: '#eef2ff', dark: '#3730a3', glow: 'rgba(79, 70, 229, .15)' },
  bg: '#f4f5f9',
  surface: { DEFAULT: '#ffffff', hover: '#fafbfe' },
  border: { DEFAULT: '#e8ebf2', light: '#f0f2f7' },
  text: { DEFAULT: '#1a1d2e', secondary: '#5c6178', muted: '#9da3b8' },
  success: { DEFAULT: '#10b981', light: '#ecfdf5' },
  warning: { DEFAULT: '#f59e0b', light: '#fffbeb' },
  danger: { DEFAULT: '#ef4444', light: '#fef2f2' },
  info: { DEFAULT: '#6366f1', light: '#eef2ff' },
  purple: '#8b5cf6',
} as const;

export const sectionColors = {
  violations: { color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
  notes: { color: '#059669', gradient: 'linear-gradient(135deg, #059669, #10b981)' },
  tardiness: { color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)' },
  permissions: { color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
  absence: { color: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c, #f97316)' },
  noor: { color: '#00695c', gradient: 'linear-gradient(135deg, #00695c, #00897b)' },
} as const;

export const degreeColors = {
  1: { label: 'الأولى', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  2: { label: 'الثانية', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  3: { label: 'الثالثة', color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' },
  4: { label: 'الرابعة', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  5: { label: 'الخامسة', color: '#7f1d1d', bg: '#fecaca', border: '#f87171' },
} as const;

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px',
  5: '20px', 6: '24px', 7: '32px', 8: '48px',
} as const;

export const radius = {
  sm: '8px', md: '12px', lg: '16px', xl: '20px',
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(0,0,0,.03)',
  sm: '0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03)',
  md: '0 4px 12px rgba(0,0,0,.06)',
  lg: '0 8px 24px rgba(0,0,0,.08)',
  xl: '0 16px 48px rgba(0,0,0,.1)',
} as const;

export const ease = 'cubic-bezier(.4, 0, .2, 1)';

// Section type for type-safe section color access
export type SectionKey = keyof typeof sectionColors;
export type DegreeKey = keyof typeof degreeColors;

// Helper to get section CSS class
export const getSectionClass = (section: SectionKey) => `sec-${section}`;
