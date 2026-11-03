import { describe, expect, it } from 'vitest';
import { GREETING_MAX, decodeGreeting, encodeGreeting, takeGreeting } from '../../src/app/greeting';

const TEXT = 'Первая строка, с запятой!\nВторая строка - Легенда';

describe('greeting link', () => {
  it('round-trips Cyrillic text and line breaks in a URL-safe form', () => {
    const g = encodeGreeting(TEXT);
    expect(g).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeGreeting(g)).toBe(TEXT);
  });

  it('ignores missing, empty or malformed data', () => {
    expect(decodeGreeting(null)).toBeNull();
    expect(decodeGreeting('')).toBeNull();
    expect(decodeGreeting('not base64!')).toBeNull();
    expect(decodeGreeting(encodeGreeting('   '))).toBeNull();
    // Valid base64 of bytes that are not UTF-8.
    expect(decodeGreeting('_-8')).toBeNull();
  });

  it('caps the length', () => {
    const long = 'а'.repeat(GREETING_MAX + 50);
    expect(decodeGreeting(encodeGreeting(long))).toHaveLength(GREETING_MAX);
  });

  it('takes the greeting out of the address and keeps the rest', () => {
    const href = `https://x.test/sudoku/?a=1&g=${encodeGreeting(TEXT)}#top`;
    expect(takeGreeting(href)).toEqual({ text: TEXT, cleanUrl: '/sudoku/?a=1#top' });
    expect(takeGreeting('https://x.test/sudoku/')).toEqual({ text: null, cleanUrl: '/sudoku/' });
  });
});
