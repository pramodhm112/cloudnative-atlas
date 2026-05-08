#!/usr/bin/env tsx
/**
 * Build-time sync: pulls Supabase rows → writes MDX/JSON files into
 * `src/content/**`. Called automatically by `prebuild` so every
 * `npm run build` refreshes the static site from the database.
 *
 * The relationship to `migrate-to-supabase.ts` is the inverse direction:
 *   migrate  →  reads FS, upserts to Supabase  (one-shot, manual)
 *   sync     ←  reads Supabase, writes FS      (every build)
 *
 * Treats `src/content/blog/`, `src/content/tests/`, `src/content/projects/`,
 * `src/content/courses/` as build artifacts. They're regenerated from
 * scratch on every run — any local edits to those files are discarded.
 *
 * Settings + contact messages are NOT synced to disk. Settings is read
 * directly via `readSettings()` from each page; contact messages are
 * admin-only and read from Supabase live.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(2);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const root = process.cwd();
const stats: Record<string, number> = {};

// ── Helpers ────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/** YAML scalar — wraps in single quotes if it could be misparsed. */
function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  // Quote anything ambiguous (colons, leading dashes, special chars)
  if (/[:#]|^[-?!&*]/.test(s) || s.includes('\n')) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

function yamlArray(arr: string[]): string {
  if (!arr || arr.length === 0) return '[]';
  return '\n' + arr.map((v) => `  - ${yamlScalar(v)}`).join('\n');
}

function writeMdx(file: string, frontmatter: Record<string, unknown>, body: string) {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      lines.push(`${k}:${yamlArray(v as string[])}`);
    } else {
      lines.push(`${k}: ${yamlScalar(v)}`);
    }
  }
  lines.push('---', '', body, '');
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

// ── Sync each table ─────────────────────────────────────────────────────────

async function syncBlog() {
  const dir = path.join(root, 'src', 'content', 'blog');
  ensureDir(dir);
  const { data, error } = await supabase.from('blog_posts').select('*');
  if (error) throw error;
  for (const r of data ?? []) {
    const fm: Record<string, unknown> = {
      title: r.title,
      description: r.description,
      pubDate: r.pub_date,
      author: r.author,
      category: r.category,
      tags: r.tags,
      status: r.status,
    };
    if (r.image) fm.image = r.image;
    writeMdx(path.join(dir, `${r.slug}.mdx`), fm, r.body ?? '');
  }
  stats.blog = (data ?? []).length;
}

async function syncTests() {
  const dir = path.join(root, 'src', 'content', 'tests');
  ensureDir(dir);
  const { data, error } = await supabase.from('practice_tests').select('*');
  if (error) throw error;
  for (const r of data ?? []) {
    const fm: Record<string, unknown> = {
      title: r.title,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      passingScore: r.passing_score,
      tags: r.tags,
      status: r.status,
    };
    if (r.time_limit !== null) fm.timeLimit = r.time_limit;
    writeMdx(path.join(dir, `${r.slug}.mdx`), fm, r.body ?? '');
  }
  stats.tests = (data ?? []).length;
}

async function syncProjects() {
  const dir = path.join(root, 'src', 'content', 'projects');
  ensureDir(dir);
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  for (const r of data ?? []) {
    const fm: Record<string, unknown> = {
      title: r.title,
      description: r.description,
      pubDate: r.pub_date,
      author: r.author,
      category: r.category,
      difficulty: r.difficulty,
      tags: r.tags,
      technologies: r.technologies,
      status: r.status,
    };
    if (r.image) fm.image = r.image;
    if (r.source_url) fm.sourceUrl = r.source_url;
    writeMdx(path.join(dir, `${r.slug}.mdx`), fm, r.body ?? '');
  }
  stats.projects = (data ?? []).length;
}

async function syncCourses() {
  const dir = path.join(root, 'src', 'content', 'courses');
  ensureDir(dir);
  const { data, error } = await supabase.from('courses').select('*');
  if (error) throw error;
  for (const r of data ?? []) {
    const courseJson = {
      title: r.title,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      tags: r.tags,
      modules: r.modules,
      status: r.status,
    };
    fs.writeFileSync(
      path.join(dir, `${r.slug}.json`),
      JSON.stringify(courseJson, null, 2) + '\n',
      'utf-8',
    );
  }
  stats.courses = (data ?? []).length;
}

async function syncSettings() {
  // settings live in Supabase only; readSettings() pulls them at runtime.
  // No file is written. Stat just for reporting completeness.
  const { data, error } = await supabase.from('settings').select('*').maybeSingle();
  if (error) throw error;
  stats.settings = data ? 1 : 0;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n  Syncing Supabase → src/content/**\n  Source: ${url}\n`);
  await syncBlog();
  await syncTests();
  await syncProjects();
  await syncCourses();
  await syncSettings();

  console.log('  Wrote:');
  for (const [k, n] of Object.entries(stats)) {
    console.log(`    ${k.padEnd(12)} ${n}`);
  }
  console.log();
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
