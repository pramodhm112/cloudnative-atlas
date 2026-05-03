import { describe, it, expect } from 'vitest';
import { ContactFormSchema } from '../contact-schema';

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  dialCode: '+1',
  mobile: '5551234567',
  country: 'US',
  message: 'Hello, this is a test message.',
  website: '',
};

describe('ContactFormSchema — happy path', () => {
  it('accepts a fully valid form', () => {
    expect(ContactFormSchema.safeParse(valid).success).toBe(true);
  });

  it('trims whitespace on names, email, and message', () => {
    const r = ContactFormSchema.safeParse({
      ...valid,
      firstName: '  Jane  ',
      lastName: '\tDoe\n',
      email: '  jane.doe@example.com ',
      message: '  hello world test  ',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.firstName).toBe('Jane');
      expect(r.data.lastName).toBe('Doe');
      expect(r.data.email).toBe('jane.doe@example.com');
      expect(r.data.message).toBe('hello world test');
    }
  });

  it('accepts non-ASCII names', () => {
    expect(ContactFormSchema.safeParse({ ...valid, firstName: 'José', lastName: 'Sønderby' }).success).toBe(true);
    expect(ContactFormSchema.safeParse({ ...valid, firstName: "O'Neill", lastName: 'St. Clair' }).success).toBe(true);
  });

  it('accepts dial codes for various countries', () => {
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '+91', country: 'IN' }).success).toBe(true);
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '+44', country: 'GB' }).success).toBe(true);
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '+880', country: 'BD' }).success).toBe(true);
  });
});

describe('ContactFormSchema — rejections', () => {
  it('rejects a name with digits or special chars', () => {
    expect(ContactFormSchema.safeParse({ ...valid, firstName: 'Jane123' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, firstName: '<script>' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(ContactFormSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, firstName: '   ' }).success).toBe(false);
  });

  it('rejects a name over 50 chars', () => {
    expect(ContactFormSchema.safeParse({ ...valid, firstName: 'a'.repeat(51) }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(ContactFormSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, email: 'a@b' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, email: '@example.com' }).success).toBe(false);
  });

  it('rejects a dial code without leading +', () => {
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '1' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '++1' }).success).toBe(false);
  });

  it('rejects an unknown dial code', () => {
    expect(ContactFormSchema.safeParse({ ...valid, dialCode: '+999' }).success).toBe(false);
  });

  it('rejects a mobile with non-digits', () => {
    expect(ContactFormSchema.safeParse({ ...valid, mobile: '555-1234' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, mobile: '555 1234' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, mobile: 'abc1234' }).success).toBe(false);
  });

  it('rejects a mobile that is too short or too long', () => {
    expect(ContactFormSchema.safeParse({ ...valid, mobile: '123' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, mobile: '1'.repeat(15) }).success).toBe(false);
  });

  it('rejects an unknown country code', () => {
    expect(ContactFormSchema.safeParse({ ...valid, country: 'XX' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, country: 'usa' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, country: 'United States' }).success).toBe(false);
  });

  it('rejects a message under 10 chars', () => {
    expect(ContactFormSchema.safeParse({ ...valid, message: 'short' }).success).toBe(false);
  });

  it('rejects a message over 2000 chars', () => {
    expect(ContactFormSchema.safeParse({ ...valid, message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects a message containing control characters (log-injection guard)', () => {
    expect(ContactFormSchema.safeParse({ ...valid, message: 'hello\u0000world ten' }).success).toBe(false);
    expect(ContactFormSchema.safeParse({ ...valid, message: 'hello\u0007world ten' }).success).toBe(false);
  });

  it('preserves common whitespace in messages (newline, tab)', () => {
    expect(ContactFormSchema.safeParse({ ...valid, message: 'line one\nline two ok' }).success).toBe(true);
    expect(ContactFormSchema.safeParse({ ...valid, message: 'tab\there please' }).success).toBe(true);
  });

  it('honeypot — rejects when website field is non-empty (bot-detected)', () => {
    expect(ContactFormSchema.safeParse({ ...valid, website: 'http://spam.example' }).success).toBe(false);
  });

  it('honeypot — accepts when website field is missing or empty', () => {
    expect(ContactFormSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
    const { website: _, ...withoutHp } = valid;
    void _;
    expect(ContactFormSchema.safeParse(withoutHp).success).toBe(true);
  });
});
