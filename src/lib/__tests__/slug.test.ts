import { describe, it, expect } from 'vitest';
import { validateSlug, isValidSlug, generateSlug } from '../slug';

describe('validateSlug', () => {
  it.each([
    'docker-fundamentals',
    'a1',
    'ab',
    '00',
    'multi-word-slug-here',
    'kubernetes-3tier-app-deployment', // numbers in the middle
  ])('accepts valid slug: %s', (slug) => {
    expect(() => validateSlug(slug)).not.toThrow();
  });

  it('rejects single-char slugs (regex requires start + end alphanumeric)', () => {
    // The pattern is ^[a-z0-9][a-z0-9-]*[a-z0-9]$ which mathematically
    // requires at least 2 characters. Documenting this constraint here.
    expect(() => validateSlug('a')).toThrow();
    expect(() => validateSlug('1')).toThrow();
  });

  it.each([
    ['empty string', ''],
    ['leading hyphen', '-foo'],
    ['trailing hyphen', 'foo-'],
    ['uppercase', 'Foo'],
    ['underscore', 'foo_bar'],
    ['space', 'foo bar'],
    ['dot', 'foo.bar'],
    ['unicode', 'café'],
    ['emoji', 'foo🚀'],
  ])('rejects invalid slug (%s)', (_label, slug) => {
    expect(() => validateSlug(slug)).toThrow();
  });

  it.each([
    ['parent traversal', '..'],
    ['nested traversal', '../etc/passwd'],
    ['forward slash', 'foo/bar'],
    ['back slash', 'foo\\bar'],
    ['dot dot in middle', 'a..b'],
  ])('rejects path-traversal: %s', (_label, slug) => {
    expect(() => validateSlug(slug)).toThrow(/path traversal|lowercase letters|1-100/);
  });

  it('rejects slugs over 100 chars', () => {
    expect(() => validateSlug('a'.repeat(101))).toThrow(/1-100/);
  });

  it('accepts slug exactly at the 100-char limit', () => {
    const longSlug = 'a' + 'b'.repeat(98) + 'c';
    expect(longSlug).toHaveLength(100);
    expect(() => validateSlug(longSlug)).not.toThrow();
  });
});

describe('isValidSlug', () => {
  it('returns true for valid slugs', () => {
    expect(isValidSlug('docker-fundamentals')).toBe(true);
  });

  it('returns false instead of throwing for invalid slugs', () => {
    expect(isValidSlug('../etc/passwd')).toBe(false);
    expect(isValidSlug('Foo Bar')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

describe('generateSlug', () => {
  it('produces lowercase hyphenated slugs', () => {
    expect(generateSlug('Docker Fundamentals')).toBe('docker-fundamentals');
  });

  it('strips punctuation', () => {
    expect(generateSlug('What Are Containers?')).toBe('what-are-containers');
    expect(generateSlug('Hello, World!')).toBe('hello-world');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(generateSlug('foo   bar  --  baz')).toBe('foo-bar-baz');
  });

  it('trims leading/trailing hyphens', () => {
    expect(generateSlug('-Foo-')).toBe('foo');
  });

  it('caps at 80 characters', () => {
    const long = 'a'.repeat(200);
    expect(generateSlug(long).length).toBeLessThanOrEqual(80);
  });

  it('falls back to a deterministic untitled-* slug for non-ASCII titles', () => {
    const out = generateSlug('日本語のみ');
    expect(out).toMatch(/^untitled-[a-z0-9]+$/);
  });

  it('output of generateSlug always passes isValidSlug', () => {
    for (const title of [
      'Hello World',
      'API: REST vs GraphQL',
      'CI/CD Pipelines 101',
      'C++ vs Rust',
    ]) {
      expect(isValidSlug(generateSlug(title))).toBe(true);
    }
  });
});
