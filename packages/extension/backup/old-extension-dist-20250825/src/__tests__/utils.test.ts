import { describe, it, expect } from 'vitest';

// Example utility function to test
export function formatTimestamp(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

describe('Extension Utils', () => {
  describe('formatTimestamp', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const result = formatTimestamp(date);
      expect(result).toBe('2025-01-15');
    });

    it('should handle different timezones', () => {
      const date = new Date('2025-12-31T23:59:59Z');
      const result = formatTimestamp(date);
      expect(result).toBe('2025-12-31');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://gamma.app')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('//invalid')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });
});