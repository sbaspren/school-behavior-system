// Mock the settings API module to avoid pulling in axios (ESM)
jest.mock('../../api/settings', () => ({
  settingsApi: {
    getStructure: jest.fn(),
    getSettings: jest.fn(),
  },
}));

import { getHijriDate } from '../../hooks/usePageData';

describe('getHijriDate', () => {
  test('returns a string', () => {
    const result = getHijriDate();
    expect(typeof result).toBe('string');
  });

  test('returns a non-empty string', () => {
    const result = getHijriDate();
    expect(result.length).toBeGreaterThan(0);
  });

  test('contains Arabic characters', () => {
    const result = getHijriDate();
    // Arabic Unicode range: \u0600-\u06FF
    expect(result).toMatch(/[\u0600-\u06FF]/);
  });
});
