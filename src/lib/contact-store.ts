/**
 * Append-only file store for contact-form submissions.
 *
 * Each submission is one JSONL line under `data/contact-messages/<YYYY-MM>.jsonl`.
 * Newest first when read. Single-process safe via `fs.appendFileSync`.
 *
 * Mutation operations (mark-read, delete) rewrite the affected month file
 * once per change — fine for low volume; not designed for high write rates.
 *
 * NOT a database — migrate to a real store (Postgres, S3, transactional
 * email service) when volume warrants it.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

/**
 * Resolve the directory that holds the JSONL files.
 * `CONTACT_DATA_DIR` env var overrides the default — used by tests to
 * isolate from real production data.
 */
function getDataDir(): string {
  return (
    process.env.CONTACT_DATA_DIR ||
    path.join(process.cwd(), 'data', 'contact-messages')
  );
}

function listMonthFiles(): string[] {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f))
    .map((f) => path.join(dir, f));
}

function getMonthFile(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return path.join(getDataDir(), `${yyyy}-${mm}.jsonl`);
}

/** Read every JSONL line in a file, ignoring blank lines and parse errors. */
function readJsonl(file: string): StoredMessage[] {
  const raw = fs.readFileSync(file, 'utf-8');
  const out: StoredMessage[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as StoredMessage);
    } catch {
      // Skip corrupt lines — better than failing the whole admin page.
    }
  }
  return out;
}

function writeJsonl(file: string, messages: StoredMessage[]): void {
  const body = messages.map((m) => JSON.stringify(m)).join('\n') + (messages.length ? '\n' : '');
  fs.writeFileSync(file, body, 'utf-8');
}

/**
 * Append a validated form submission to the current month's JSONL file.
 * Returns the stored message (with generated id + timestamp).
 */
export function storeContactMessage(
  form: ContactForm,
  meta: { ip?: string; userAgent?: string } = {}
): StoredMessage {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const stored: StoredMessage = {
    id: crypto.randomBytes(8).toString('hex'),
    receivedAt: now.toISOString(),
    ip: meta.ip,
    userAgent: meta.userAgent?.slice(0, 200),
    read: false,
    ...form,
  };

  fs.appendFileSync(getMonthFile(now), JSON.stringify(stored) + '\n', { encoding: 'utf-8' });
  return stored;
}

/**
 * Read every stored message across every month, sorted newest-first.
 *
 * For tiny volumes (< 10k entries) this is fine; revisit if we ever ship
 * to a high-traffic site.
 */
export function listContactMessages(): StoredMessage[] {
  const all: StoredMessage[] = [];
  for (const file of listMonthFiles()) all.push(...readJsonl(file));
  return all.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/** Look up a single message by id (linear scan — acceptable at this scale). */
export function getContactMessage(id: string): StoredMessage | null {
  for (const file of listMonthFiles()) {
    const messages = readJsonl(file);
    const found = messages.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

/**
 * Update the message in place: rewrites only the file that contains it.
 * Returns the updated message, or null if the id wasn't found.
 */
export function updateContactMessage(
  id: string,
  patch: Partial<Pick<StoredMessage, 'read'>>
): StoredMessage | null {
  for (const file of listMonthFiles()) {
    const messages = readJsonl(file);
    const idx = messages.findIndex((m) => m.id === id);
    if (idx === -1) continue;
    const updated: StoredMessage = { ...messages[idx], ...patch };
    messages[idx] = updated;
    writeJsonl(file, messages);
    return updated;
  }
  return null;
}

/**
 * Remove a message from disk. Returns true on success, false if not found.
 * Empty month files are deleted to avoid leaving stale entries in listings.
 */
export function deleteContactMessage(id: string): boolean {
  for (const file of listMonthFiles()) {
    const messages = readJsonl(file);
    const before = messages.length;
    const remaining = messages.filter((m) => m.id !== id);
    if (remaining.length === before) continue;
    if (remaining.length === 0) {
      fs.unlinkSync(file);
    } else {
      writeJsonl(file, remaining);
    }
    return true;
  }
  return false;
}

/**
 * Mask an email so it can be safely included in logs:
 *   "alice.example@gmail.com"  →  "a***e@gmail.com"
 *   "x@y.com"                  →  "x***@y.com"
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}
