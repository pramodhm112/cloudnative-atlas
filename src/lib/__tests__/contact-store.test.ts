import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ContactForm } from '../contact-schema';

// Mock the supabase module BEFORE importing contact-store. The mocked
// `getSupabaseAdmin` returns an in-memory query-builder that mimics the
// subset of the supabase-js API the store actually uses (insert / select /
// update / delete with `.eq()` / `.order()` / `.maybeSingle()` /
// `.single()`). Keeps tests fast and offline.

interface Row {
  id: string;
  received_at: string;
  ip: string | null;
  user_agent: string | null;
  read: boolean;
  first_name: string;
  last_name: string;
  email: string;
  dial_code: string;
  mobile: string;
  country: string;
  message: string;
}

let store: Row[] = [];

function makeBuilder() {
  // Each method returns `this` so calls can chain. Terminal methods
  // (`maybeSingle`, `single`, awaiting the builder directly) resolve with
  // a Supabase-shaped `{ data, error, count? }` object.
  let pending: 'insert' | 'select' | 'update' | 'delete' | null = null;
  let payload: Partial<Row> | null = null;
  let filterId: string | null = null;
  let orderField: string | null = null;
  let orderAsc = true;
  let countMode: 'exact' | undefined;

  const builder: Record<string, unknown> = {
    insert(row: Row) {
      pending = 'insert';
      store.push({ ...row, received_at: row.received_at ?? new Date().toISOString() });
      payload = row;
      return builder;
    },
    update(patch: Partial<Row>) {
      pending = 'update';
      payload = patch;
      return builder;
    },
    delete(opts?: { count?: 'exact' }) {
      pending = 'delete';
      countMode = opts?.count;
      return builder;
    },
    select(_cols?: string) {
      if (!pending) pending = 'select';
      return builder;
    },
    eq(_col: string, val: string) {
      filterId = val;
      return builder;
    },
    order(field: string, opts: { ascending: boolean }) {
      orderField = field;
      orderAsc = opts.ascending;
      return builder;
    },
    maybeSingle() {
      const r = resolveSelectOrUpdate();
      return Promise.resolve({ data: r ?? null, error: null });
    },
    single() {
      const r = resolveSelectOrUpdate();
      return r
        ? Promise.resolve({ data: r, error: null })
        : Promise.resolve({ data: null, error: { message: 'not found' } });
    },
    // Awaiting the builder directly (no terminal call) is how list+delete
    // operations resolve. JS calls `then` on the returned thenable.
    then(resolve: (v: { data: Row[] | null; error: null; count?: number }) => unknown) {
      if (pending === 'select') {
        let rows = filterId ? store.filter((r) => r.id === filterId) : [...store];
        if (orderField) {
          rows.sort((a, b) => {
            const av = String(a[orderField as keyof Row] ?? '');
            const bv = String(b[orderField as keyof Row] ?? '');
            return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }
        resolve({ data: rows, error: null });
      } else if (pending === 'delete') {
        const before = store.length;
        store = filterId ? store.filter((r) => r.id !== filterId) : [];
        const count = before - store.length;
        resolve({ data: null, error: null, count: countMode === 'exact' ? count : undefined });
      }
    },
  };

  function resolveSelectOrUpdate(): Row | undefined {
    if (pending === 'insert') {
      return store.find((r) => r.id === (payload as Row).id);
    }
    if (pending === 'select') {
      return filterId ? store.find((r) => r.id === filterId) : store[0];
    }
    if (pending === 'update' && filterId) {
      const idx = store.findIndex((r) => r.id === filterId);
      if (idx === -1) return undefined;
      store[idx] = { ...store[idx], ...(payload as Partial<Row>) };
      return store[idx];
    }
    return undefined;
  }

  return builder;
}

vi.mock('../supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => makeBuilder(),
  }),
}));

// Imports happen AFTER the mock is set up — vi.mock is hoisted by Vitest
// to before the import statements.
const {
  maskEmail,
  storeContactMessage,
  listContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
} = await import('../contact-store');

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
    expect(maskEmail('jane@subdomain.deeply.nested.example.co.uk')).toContain(
      '@subdomain.deeply.nested.example.co.uk',
    );
  });

  it('uses the LAST @ for splitting (handles unusual local parts)', () => {
    expect(maskEmail('weird@local@example.com')).toContain('@example.com');
  });
});

describe('contact-store CRUD (mocked supabase)', () => {
  beforeEach(() => {
    store = [];
  });

  it('store → list → get round trip', async () => {
    const a = await storeContactMessage(sample, { ip: '1.2.3.4', userAgent: 'vitest' });
    // Tiny delay so the second receivedAt sorts after the first when ordering
    // descending — the in-memory store uses string-compare on ISO timestamps.
    await new Promise((r) => setTimeout(r, 5));
    const b = await storeContactMessage({ ...sample, firstName: 'Two' }, { ip: '5.6.7.8' });

    const all = await listContactMessages();
    expect(all).toHaveLength(2);
    // Newest-first order
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);

    const fetched = await getContactMessage(a.id);
    expect(fetched?.firstName).toBe('Test');
    expect(fetched?.ip).toBe('1.2.3.4');
    expect(fetched?.read).toBe(false);
  });

  it('updateContactMessage flips read flag', async () => {
    const m = await storeContactMessage(sample);
    const updated = await updateContactMessage(m.id, { read: true });
    expect(updated?.read).toBe(true);

    const reloaded = await getContactMessage(m.id);
    expect(reloaded?.read).toBe(true);

    await updateContactMessage(m.id, { read: false });
    expect((await getContactMessage(m.id))?.read).toBe(false);
  });

  it('updateContactMessage returns null for unknown id', async () => {
    expect(await updateContactMessage('0000000000000000', { read: true })).toBeNull();
  });

  it('deleteContactMessage removes the message and reports success', async () => {
    const a = await storeContactMessage(sample);
    const b = await storeContactMessage({ ...sample, firstName: 'B' });

    expect(await deleteContactMessage(a.id)).toBe(true);
    expect(await getContactMessage(a.id)).toBeNull();
    expect((await getContactMessage(b.id))?.firstName).toBe('B');
  });

  it('deleteContactMessage returns false for unknown id', async () => {
    await storeContactMessage(sample);
    expect(await deleteContactMessage('deadbeefdeadbeef')).toBe(false);
  });
});
