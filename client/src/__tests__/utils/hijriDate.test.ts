import { formatHijri, formatHijriFull, getTodayHijri, displayHijri } from '../../utils/hijriDate';

describe('formatHijri', () => {
  test('returns empty string for null', () => {
    expect(formatHijri(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatHijri(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(formatHijri('')).toBe('');
  });

  test('returns a non-empty string for a valid Date object', () => {
    const result = formatHijri(new Date('2024-01-15'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns a non-empty string for a valid date string', () => {
    const result = formatHijri('2024-06-01');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns the original string for an invalid date string', () => {
    const result = formatHijri('not-a-date');
    expect(result).toBe('not-a-date');
  });
});

describe('formatHijriFull', () => {
  test('returns empty string for null', () => {
    expect(formatHijriFull(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatHijriFull(undefined)).toBe('');
  });

  test('returns a non-empty string for a valid Date object', () => {
    const result = formatHijriFull(new Date('2024-01-15'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns the original string for an invalid date string', () => {
    const result = formatHijriFull('invalid');
    expect(result).toBe('invalid');
  });
});

describe('getTodayHijri', () => {
  test('returns a non-empty string', () => {
    const result = getTodayHijri();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('displayHijri', () => {
  test('returns hijriDate if provided', () => {
    expect(displayHijri('1446/02/15')).toBe('1446/02/15');
  });

  test('returns hijriDate even if miladiDate is also provided', () => {
    expect(displayHijri('1446/02/15', '2024-08-20')).toBe('1446/02/15');
  });

  test('computes from miladiDate if hijriDate is undefined', () => {
    const result = displayHijri(undefined, '2024-06-01');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns empty string when both are undefined', () => {
    expect(displayHijri(undefined, undefined)).toBe('');
  });

  test('returns empty string when both are omitted', () => {
    expect(displayHijri()).toBe('');
  });
});
