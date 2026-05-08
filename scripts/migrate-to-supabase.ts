#!/usr/bin/env tsx
/**
 * One-shot migration script: copies existing filesystem content into Supabase.
 *
 * Usage:
 *   npm run db:migrate-content -- --dry-run    # count rows, no writes
 *   npm run db:migrate-content                 # actually upsert
 *
 * Idempotent: every write uses upsert on the natural key (slug for content
 * tables, id for contact_messages, singleton for settings). Safe to re-run.
 *
 * Environment:
 *   SUPABASE_URL                  required
 *   SUPABASE_SERVICE_ROLE_KEY     required (server-only, never imported in app code)
 *
 * Reads:
 *   src/content/blog/**.mdx       → blog_posts
 *   src/content/tests/**.mdx      → practice_tests
 *   src/content/projects/**.mdx   → projects
 *   src/content/courses/*.json    → courses
 *   src/content/settings.json     → settings
 *   data/contact-messages/*.jsonl → contact_messages
 *
 * Run order is settings → courses → blog/tests/projects → contact_messages.
 * No table-to-table foreign keys, so order is mostly cosmetic — but doing
 * settings first lets you smoke-test the connection before the bulk inserts.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

// ── CLI args ────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

// ── Supabase client ─────────────────────────────────────────────────────────
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment ' +
      '(e.g. via .env loaded by tsx, or `export` before running).',
  );
  process.exit(2);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const root = process.cwd();
const stats: Record<string, { read: number; written: number; skipped: number; errors: string[] }> = {};

function track(table: string) {
  if (!stats[table]) stats[table] = { read: 0, written: 0, skipped: 0, errors: [] };
  return stats[table];
}

function readMdx(file: string): { data: Record<string, unknown>; body: string } {
  const raw = fs.readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);
  return {
    data,
    body: content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim(),
  };
}

function listMdx(dir: string): string[] {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join(full, f));
}

// ── Per-table mappers ──────────────────────────────────────────────────────
// camelCase frontmatter → snake_case row. Defaults match the SQL schema.

function blogToRow(slug: string, fm: Record<string, unknown>, body: string) {
  return {
    slug,
    title: String(fm.title ?? ''),
    description: String(fm.description ?? ''),
    pub_date: new Date(String(fm.pubDate ?? new Date().toISOString())).toISOString().slice(0, 10),
    author: String(fm.author ?? 'CloudNative Atlas Team'),
    category: String(fm.category ?? 'DevOps'),
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    image: typeof fm.image === 'string' ? fm.image : null,
    status: String(fm.status ?? 'published'),
    body,
  };
}

function testToRow(slug: string, fm: Record<string, unknown>, body: string) {
  return {
    slug,
    title: String(fm.title ?? ''),
    description: String(fm.description ?? ''),
    category: String(fm.category ?? 'DevOps'),
    difficulty: String(fm.difficulty ?? 'Beginner'),
    time_limit: typeof fm.timeLimit === 'number' ? fm.timeLimit : null,
    passing_score: typeof fm.passingScore === 'number' ? fm.passingScore : 70,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    status: String(fm.status ?? 'published'),
    body,
  };
}

function projectToRow(slug: string, fm: Record<string, unknown>, body: string) {
  return {
    slug,
    title: String(fm.title ?? ''),
    description: String(fm.description ?? ''),
    pub_date: new Date(String(fm.pubDate ?? new Date().toISOString())).toISOString().slice(0, 10),
    author: String(fm.author ?? 'CloudNative Atlas Team'),
    category: String(fm.category ?? 'DevOps'),
    difficulty: String(fm.difficulty ?? 'Beginner'),
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    technologies: Array.isArray(fm.technologies) ? (fm.technologies as string[]) : [],
    image: typeof fm.image === 'string' ? fm.image : null,
    source_url: typeof fm.sourceUrl === 'string' ? fm.sourceUrl : null,
    status: String(fm.status ?? 'published'),
    body,
  };
}

function courseToRow(slug: string, data: Record<string, unknown>) {
  return {
    slug,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    category: String(data.category ?? 'DevOps'),
    difficulty: String(data.difficulty ?? 'Beginner'),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    status: String(data.status ?? 'draft'),
    modules: Array.isArray(data.modules) ? data.modules : [],
  };
}

// ── Migration steps ────────────────────────────────────────────────────────
async function migrateMdxCollection(
  dir: string,
  table: string,
  toRow: (slug: string, fm: Record<string, unknown>, body: string) => Record<string, unknown>,
) {
  const s = track(table);
  const files = listMdx(dir);
  s.read = files.length;

  for (const file of files) {
    const slug = path.basename(file, '.mdx');
    try {
      const { data, body } = readMdx(file);
      const row = toRow(slug, data, body);
      if (verbose) console.log(`  ${slug} → ${table}`);
      if (!dryRun) {
        const { error } = await supabase.from(table).upsert(row, { onConflict: 'slug' });
        if (error) {
          s.errors.push(`${slug}: ${error.message}`);
          continue;
        }
      }
      s.written++;
    } catch (err) {
      s.errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function migrateCourses() {
  const s = track('courses');
  const dir = path.join(root, 'src', 'content', 'courses');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  s.read = files.length;

  for (const file of files) {
    const slug = path.basename(file, '.json');
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const row = courseToRow(slug, data);
      if (verbose) console.log(`  ${slug} → courses`);
      if (!dryRun) {
        const { error } = await supabase.from('courses').upsert(row, { onConflict: 'slug' });
        if (error) {
          s.errors.push(`${slug}: ${error.message}`);
          continue;
        }
      }
      s.written++;
    } catch (err) {
      s.errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function migrateSettings() {
  const s = track('settings');
  const file = path.join(root, 'src', 'content', 'settings.json');
  if (!fs.existsSync(file)) return;
  s.read = 1;

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const row = {
      singleton: true,
      enable_presentations: !!data.enablePresentations,
      enable_videos: !!data.enableVideos,
    };
    if (!dryRun) {
      const { error } = await supabase.from('settings').upsert(row, { onConflict: 'singleton' });
      if (error) {
        s.errors.push(error.message);
        return;
      }
    }
    s.written = 1;
  } catch (err) {
    s.errors.push(err instanceof Error ? err.message : String(err));
  }
}

async function migrateContactMessages() {
  const s = track('contact_messages');
  const dir = path.join(root, 'data', 'contact-messages');
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f));

  for (const file of files) {
    const lines = fs
      .readFileSync(path.join(dir, file), 'utf-8')
      .split('\n')
      .filter((l) => l.trim() !== '');
    s.read += lines.length;

    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        const row = {
          id: m.id,
          received_at: m.receivedAt,
          ip: m.ip ?? null,
          user_agent: m.userAgent ?? null,
          read: !!m.read,
          first_name: m.firstName,
          last_name: m.lastName,
          email: m.email,
          dial_code: m.dialCode,
          mobile: m.mobile,
          country: m.country,
          message: m.message,
        };
        if (!dryRun) {
          const { error } = await supabase
            .from('contact_messages')
            .upsert(row, { onConflict: 'id' });
          if (error) {
            s.errors.push(`${m.id}: ${error.message}`);
            continue;
          }
        }
        s.written++;
      } catch (err) {
        s.errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  ${dryRun ? '[DRY RUN] ' : ''}Migrating filesystem content → Supabase\n`);
  console.log(`  Target: ${url}\n`);

  await migrateSettings();
  await migrateCourses();
  await migrateMdxCollection('src/content/blog', 'blog_posts', blogToRow);
  await migrateMdxCollection('src/content/tests', 'practice_tests', testToRow);
  await migrateMdxCollection('src/content/projects', 'projects', projectToRow);
  await migrateContactMessages();

  console.log('\n  Results:\n');
  let anyErrors = false;
  for (const [table, s] of Object.entries(stats)) {
    const verb = dryRun ? 'would write' : 'wrote';
    console.log(`    ${table.padEnd(20)} read=${s.read}  ${verb}=${s.written}  errors=${s.errors.length}`);
    if (s.errors.length) {
      anyErrors = true;
      for (const e of s.errors.slice(0, 5)) console.log(`        ! ${e}`);
      if (s.errors.length > 5) console.log(`        ... and ${s.errors.length - 5} more`);
    }
  }
  console.log();
  process.exit(anyErrors ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
