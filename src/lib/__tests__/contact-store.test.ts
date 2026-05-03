import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  maskEmail,
  storeContactMessage,
  listContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
} from '../contact-store';
import type { ContactForm } from '../contact-schema';

// Isolate tests from real production data by pointing the store at a
// fresh per-run temp directory.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-store-test-'));

beforeAll(() => {
  process.env.CONTACT_DATA_DIR = dataDir;
});

function clearStore(): void {
  if (!fs.existsSync(dataDir)) return;
  for (const f of fs.readdirSync(dataDir)) {
    if (/\.jsonl$/.test(f)) fs.unlinkSync(path.join(dataDir, f));
  }
}

const sample: ContactForm = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  dialCode: '+1',
  mobile: '5551234567',
  country: 'US',
  message: 'Sample test message for the store.',
  website: '',
};

describe('maskEmail', () => {
  it('masks the local part of a normal email', () => {
    expect(maskEmail('alice.example@gmail.com')).toBe('a***e@gmail.com');
  });

  it('handles a single-char local part', () => {
    expect(maskEmail('x@example.com')).toBe('x***@example.com');
  });

  it('handles a two-char local part', () => {
    expect(maskEmail('jo@example.com')).toBe('j***@example.com');
  });

  it('returns *** for emails with no @ or @ at position 0', () => {
    expect(maskEmail('not-an-email')).toBe('***');
    expect(maskEmail('@example.com')).toBe('***');
  });

  it('preserves the full domain', () => {
    expect(maskEmail('jane@subdomain.deeply.nested.example.co.uk')).toContain('@subdomain.deeply.nested.example.co.uk');
  });

  it('uses the LAST @ for splitting (handles unusual local parts)', () => {
    // Quoted local-parts with @ inside are valid per RFC; we use lastIndexOf
    // so the domain stays correct even if the local part contains an @.
    expect(maskEmail('weird@local@example.com')).toContain('@example.com');
  });
});

describe('contact-store CRUD (isolated temp dir)', () => {
  beforeEach(clearStore);
  afterAll(() => {
    clearStore();
    try { fs.rmdirSync(dataDir); } catch { /* not empty — leave it */ }
  });

  it('store → list → get round trip', () => {
    const a = storeContactMessage(sample, { ip: '1.2.3.4', userAgent: 'vitest' });
    const b = storeContactMessage({ ...sample, firstName: 'Two' }, { ip: '5.6.7.8' });

    const all = listContactMessages();
    expect(all).toHaveLength(2);
    // Newest-first order
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);

    const fetched = getContactMessage(a.id);
    expect(fetched?.firstName).toBe('Test');
    expect(fetched?.ip).toBe('1.2.3.4');
    // New messages default to unread
    expect(fetched?.read).toBe(false);
  });

  it('updateContactMessage flips read flag', () => {
    const m = storeContactMessage(sample);
    const updated = updateContactMessage(m.id, { read: true });
    expect(updated?.read).toBe(true);

    // Re-read from disk to confirm persistence
    const reloaded = getContactMessage(m.id);
    expect(reloaded?.read).toBe(true);

    // Toggle back
    updateContactMessage(m.id, { read: false });
    expect(getContactMessage(m.id)?.read).toBe(false);
  });

  it('updateContactMessage returns null for unknown id', () => {
    expect(updateContactMessage('0000000000000000', { read: true })).toBeNull();
  });

  it('deleteContactMessage removes the message and reports success', () => {
    const a = storeContactMessage(sample);
    const b = storeContactMessage({ ...sample, firstName: 'B' });

    expect(deleteContactMessage(a.id)).toBe(true);
    expect(getContactMessage(a.id)).toBeNull();
    // Sibling message untouched
    expect(getContactMessage(b.id)?.firstName).toBe('B');
  });

  it('deleteContactMessage returns false for unknown id', () => {
    storeContactMessage(sample);
    expect(deleteContactMessage('deadbeefdeadbeef')).toBe(false);
  });

  it('deleting the last message in a month removes the file (no orphan)', () => {
    const m = storeContactMessage(sample);
    expect(fs.readdirSync(dataDir).filter((f) => /\.jsonl$/.test(f))).toHaveLength(1);
    expect(deleteContactMessage(m.id)).toBe(true);
    // File should be gone now
    expect(fs.readdirSync(dataDir).filter((f) => /\.jsonl$/.test(f))).toHaveLength(0);
    expect(listContactMessages()).toEqual([]);
  });
});
