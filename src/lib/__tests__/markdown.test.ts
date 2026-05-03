import { describe, it, expect } from 'vitest';
import { renderMarkdown, stripLeadingTitle } from '../markdown';

describe('renderMarkdown — XSS sanitization', () => {
  it('escapes raw <script> tags as text, never as executable script', () => {
    const out = renderMarkdown('# hi\n\n<script>alert(1)</script>');
    expect(out).not.toMatch(/<script[^>]*>alert/i);
    // Should contain the escaped form so the user still sees the literal
    expect(out).toContain('&lt;script&gt;');
  });

  it('strips javascript: URLs from anchor href', () => {
    const out = renderMarkdown('[click](javascript:alert(1))');
    expect(out).not.toMatch(/javascript:/i);
    // The link text survives, just without an href
    expect(out).toMatch(/<a[^>]*>click<\/a>/);
  });

  it('strips data:text/html URLs from img src', () => {
    const out = renderMarkdown('![x](data:text/html,<script>alert(1)</script>)');
    expect(out).not.toMatch(/data:text\/html/i);
    // The img tag survives, just without a src
    expect(out).toMatch(/<img[^>]*alt="x"/);
  });

  it('strips vbscript: and file: URLs', () => {
    expect(renderMarkdown('[v](vbscript:msgbox)')).not.toMatch(/vbscript:/i);
    expect(renderMarkdown('[f](file:///etc/passwd)')).not.toMatch(/file:/i);
  });

  it('preserves safe markdown — links, bold, headings, code', () => {
    const md = '# Title\n\n**bold** and [link](https://example.com)\n\n`code`';
    const out = renderMarkdown(md);
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<a href="https://example.com"');
    expect(out).toContain('<code>code</code>');
  });

  it('preserves root-relative and fragment URLs', () => {
    const out = renderMarkdown('[home](/) and [section](#anchor)');
    expect(out).toMatch(/href="\/"/);
    expect(out).toMatch(/href="#anchor"/);
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('   ')).toBe('');
  });
});

describe('stripLeadingTitle', () => {
  it('strips a level-1 heading that matches the title (case-insensitive)', () => {
    const md = '# What Are Containers?\n\nIntro paragraph.';
    expect(stripLeadingTitle(md, 'What Are Containers?')).toBe('Intro paragraph.');
  });

  it('strips a level-2 or level-3 heading too', () => {
    expect(stripLeadingTitle('## Foo\n\nbody', 'Foo')).toBe('body');
    expect(stripLeadingTitle('### Foo\n\nbody', 'Foo')).toBe('body');
  });

  it('tolerates trailing punctuation differences', () => {
    expect(stripLeadingTitle('# What Are Containers\n\nbody', 'What Are Containers?')).toBe('body');
    expect(stripLeadingTitle('# Hello!\n\nbody', 'hello')).toBe('body');
  });

  it('tolerates leading whitespace and Windows line endings', () => {
    expect(stripLeadingTitle('\n\n# Foo\r\n\r\nbody', 'Foo')).toBe('body');
  });

  it('does not strip headings that do not match', () => {
    const md = '# Different Title\n\nbody';
    expect(stripLeadingTitle(md, 'What Are Containers?')).toBe(md);
  });

  it('does not strip when the first non-empty line is not a heading', () => {
    // Note: leading whitespace is trimmed by the helper, so this preserves the text starting from "Some text"
    const md = '   Some text\n\n# Foo\n\nbody';
    expect(stripLeadingTitle(md, 'Foo')).toContain('Some text');
    expect(stripLeadingTitle(md, 'Foo')).toContain('# Foo');
  });

  it('does not strip a code-block that contains a # at start', () => {
    const md = '```\n# not a heading\n```\n\n# Real Heading\n\nbody';
    // First line is '```' not a heading, so nothing gets stripped
    expect(stripLeadingTitle(md, 'Real Heading')).toBe(md);
  });

  it('handles empty/missing inputs gracefully', () => {
    expect(stripLeadingTitle('', 'Foo')).toBe('');
    expect(stripLeadingTitle('# Foo', '')).toBe('# Foo'); // empty title -> no-op
  });
});
