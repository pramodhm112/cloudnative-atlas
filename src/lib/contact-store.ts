/**
 * Contact-form submission store, backed by Supabase (Postgres).
 *
 * Public API is identical to the previous filesystem-backed implementation
 * (`storeContactMessage`, `listContactMessages`, `getContactMessage`,
 * `updateContactMessage`, `deleteContactMessage`, `maskEmail`) — every
 * caller (the public form handler, admin list/detail pages, the messages
 * REST endpoint) keeps working without changes.
 *
 * The 16-hex-char id is still generated client-side via
 * `crypto.randomBytes(8)` so application logs and admin URLs that reference
 * specific messages stay correlatable across the migration.
 *
 * RLS is enabled on `contact_messages` with no policies — only the
 * service-role client can read or write. We exclusively use that client
 * here (`getSupabaseAdmin`).
 */

import crypto from 'node:crypto';
import { getSupabaseAdmin, type ContactMessageRow } from './supabase';
import type { ContactForm } from './contact-schema';

export interface StoredMessage extends ContactForm {
  /** Random 16-hex-char id. Stable across reads/writes. */
  id: string;
  /** ISO 8601 UTC timestamp of receipt. */
  receivedAt: string;
  /** Origin IP (best-effort — proxies may strip). */
  ip?: string;
  /** Truncated user-agent (<= 200 chars). */
  userAgent?: string;
  /** Optional admin annotation: read=true after the admin has viewed it. */
  read?: boolean;
}

// snake_case row → camelCase shape used by the rest of the app.
function rowToMessage(row: ContactMessageRow): StoredMessage {
  return {
    id: row.id,
    receivedAt: row.received_at,
    ip: row.ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
    read: row.read,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    dialCode: row.dial_code,
    mobile: row.mobile,
    country: row.country,
    message: row.message,
  };
}

/**
 * Insert a validated form submission into the `contact_messages` table.
 * Returns the stored message (with generated id + DB-assigned timestamp).
 */
export async function storeContactMessage(
  form: ContactForm,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<StoredMessage> {
  const id = crypto.randomBytes(8).toString('hex');
  const userAgent = meta.userAgent?.slice(0, 200);

  const insertRow = {
    id,
    ip: meta.ip ?? null,
    user_agent: userAgent ?? null,
    read: false,
    first_name: form.firstName,
    last_name: form.lastName,
    email: form.email,
    dial_code: form.dialCode,
    mobile: form.mobile,
    country: form.country,
    message: form.message,
  };

  const { data, error } = await getSupabaseAdmin()
    .from('contact_messages')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    throw new Error(`storeContactMessage: ${error.message}`);
  }
  return rowToMessage(data as ContactMessageRow);
}

/** Read every stored message, sorted newest-first. */
export async function listContactMessages(): Promise<StoredMessage[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('contact_messages')
    .select('*')
    .order('received_at', { ascending: false });

  if (error) throw new Error(`listContactMessages: ${error.message}`);
  return (data as ContactMessageRow[]).map(rowToMessage);
}

/** Look up a single message by id. Returns null if not found. */
export async function getContactMessage(id: string): Promise<StoredMessage | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('contact_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getContactMessage: ${error.message}`);
  return data ? rowToMessage(data as ContactMessageRow) : null;
}

/**
 * Update mutable fields on a message. Returns the updated message, or
 * null if no row matched the id.
 *
 * Currently only `read` is mutable — the patch type enforces this.
 */
export async function updateContactMessage(
  id: string,
  patch: Partial<Pick<StoredMessage, 'read'>>,
): Promise<StoredMessage | null> {
  if (Object.keys(patch).length === 0) {
    // Nothing to do; return current row so callers can chain.
    return getContactMessage(id);
  }

  const dbPatch: Record<string, unknown> = {};
  if (typeof patch.read === 'boolean') dbPatch.read = patch.read;

  const { data, error } = await getSupabaseAdmin()
    .from('contact_messages')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`updateContactMessage: ${error.message}`);
  return data ? rowToMessage(data as ContactMessageRow) : null;
}

/** Delete a message. Returns true on success, false if not found. */
export async function deleteContactMessage(id: string): Promise<boolean> {
  const { error, count } = await getSupabaseAdmin()
    .from('contact_messages')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) throw new Error(`deleteContactMessage: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Mask an email so it can be safely included in logs:
 *   "alice.example@gmail.com"  →  "a***e@gmail.com"
 *   "x@y.com"                  →  "x***@y.com"
 *
 * Pure helper — no Supabase dependency. Re-exported so existing log call
 * sites keep working.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}
