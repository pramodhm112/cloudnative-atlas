/**
 * Content store for blog posts + practice tests, backed by Supabase.
 *
 * Public API mirrors the previous filesystem-backed implementation so
 * existing call sites — admin Actions, admin edit pages — keep working
 * without changes:
 *
 *   listContent(collection)            → ContentItem[]
 *   readContent(collection, slug)      → ContentItem | null
 *   writeContent(c, slug, fm, body)    → void
 *   deleteContent(c, slug)             → boolean
 *   contentExists(c, slug)             → boolean
 *   generateSlug(title)                → string  (pure)
 *   serializeQuestions / parseQuestions  (pure)
 *
 * The mapping between camelCase frontmatter (used everywhere in JS) and
 * snake_case Postgres columns lives entirely in this file. Callers never
 * see snake_case.
 *
 * `body` continues to hold raw MDX. For practice tests, the body uses the
 * existing `> question` / `> * answer` / `> - wrong` blockquote grammar
 * that {@link parseQuestions} understands — no schema change.
 */

import { getSupabaseAdmin, type BlogPostRow, type PracticeTestRow } from './supabase';

export type ContentCollection = 'blog' | 'tests';

const TABLE_BY_COLLECTION: Record<ContentCollection, 'blog_posts' | 'practice_tests'> = {
  blog: 'blog_posts',
  tests: 'practice_tests',
};

export interface ContentItem {
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface BlogFrontmatter {
  title: string;
  description: string;
  pubDate: string;
  author: string;
  category: 'DevOps' | 'Cloud' | 'AI' | 'Security';
  tags: string[];
  image?: string;
  status?: 'draft' | 'published';
}

export interface TestFrontmatter {
  title: string;
  description: string;
  category: 'DevOps' | 'Cloud' | 'AI' | 'Security';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeLimit?: number;
  passingScore: number;
  tags: string[];
  status?: 'draft' | 'published';
}

export interface QuestionData {
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Row ↔ ContentItem mappers ───────────────────────────────────────────────
// Supabase returns snake_case; the rest of the app talks camelCase. Translate
// once at the manager boundary so call sites don't need to know about either
// shape.

function blogRowToItem(row: BlogPostRow): ContentItem {
  return {
    slug: row.slug,
    body: row.body,
    frontmatter: {
      title: row.title,
      description: row.description,
      pubDate: row.pub_date,
      author: row.author,
      category: row.category,
      tags: row.tags,
      ...(row.image ? { image: row.image } : {}),
      status: row.status,
    },
  };
}

function testRowToItem(row: PracticeTestRow): ContentItem {
  return {
    slug: row.slug,
    body: row.body,
    frontmatter: {
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      ...(row.time_limit !== null ? { timeLimit: row.time_limit } : {}),
      passingScore: row.passing_score,
      tags: row.tags,
      status: row.status,
    },
  };
}

function rowToItem(c: ContentCollection, row: BlogPostRow | PracticeTestRow): ContentItem {
  return c === 'blog' ? blogRowToItem(row as BlogPostRow) : testRowToItem(row as PracticeTestRow);
}

function frontmatterToBlogPatch(slug: string, fm: Record<string, unknown>, body: string) {
  return {
    slug,
    title: String(fm.title ?? ''),
    description: String(fm.description ?? ''),
    pub_date: typeof fm.pubDate === 'string'
      ? fm.pubDate.slice(0, 10)
      : new Date(String(fm.pubDate ?? new Date().toISOString())).toISOString().slice(0, 10),
    author: String(fm.author ?? 'CloudNative Atlas Team'),
    category: String(fm.category ?? 'DevOps'),
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    image: typeof fm.image === 'string' ? fm.image : null,
    status: String(fm.status ?? 'published'),
    body,
  };
}

function frontmatterToTestPatch(slug: string, fm: Record<string, unknown>, body: string) {
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

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function listContent(collection: ContentCollection): Promise<ContentItem[]> {
  const table = TABLE_BY_COLLECTION[collection];
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .select('*')
    .order(collection === 'blog' ? 'pub_date' : 'created_at', { ascending: false });

  if (error) throw new Error(`listContent(${collection}): ${error.message}`);
  return (data as Array<BlogPostRow | PracticeTestRow>).map((r) => rowToItem(collection, r));
}

export async function readContent(
  collection: ContentCollection,
  slug: string,
): Promise<ContentItem | null> {
  const table = TABLE_BY_COLLECTION[collection];
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`readContent(${collection}, ${slug}): ${error.message}`);
  return data ? rowToItem(collection, data as BlogPostRow | PracticeTestRow) : null;
}

export async function writeContent(
  collection: ContentCollection,
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<void> {
  const table = TABLE_BY_COLLECTION[collection];
  const row =
    collection === 'blog'
      ? frontmatterToBlogPatch(slug, frontmatter, body)
      : frontmatterToTestPatch(slug, frontmatter, body);

  const { error } = await getSupabaseAdmin()
    .from(table)
    .upsert(row, { onConflict: 'slug' });

  if (error) throw new Error(`writeContent(${collection}, ${slug}): ${error.message}`);
}

export async function deleteContent(
  collection: ContentCollection,
  slug: string,
): Promise<boolean> {
  const table = TABLE_BY_COLLECTION[collection];
  const { error, count } = await getSupabaseAdmin()
    .from(table)
    .delete({ count: 'exact' })
    .eq('slug', slug);

  if (error) throw new Error(`deleteContent(${collection}, ${slug}): ${error.message}`);
  return (count ?? 0) > 0;
}

export async function contentExists(
  collection: ContentCollection,
  slug: string,
): Promise<boolean> {
  const table = TABLE_BY_COLLECTION[collection];
  const { error, count } = await getSupabaseAdmin()
    .from(table)
    .select('slug', { count: 'exact', head: true })
    .eq('slug', slug);

  if (error) throw new Error(`contentExists(${collection}, ${slug}): ${error.message}`);
  return (count ?? 0) > 0;
}

// ── Pure helpers (no DB) ────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export function serializeQuestions(questions: QuestionData[]): string {
  return questions
    .map((q) => {
      const lines = [`> ${q.question}`];
      q.options.forEach((opt, i) => {
        const prefix = i === q.correctIndex ? '> *' : '> -';
        lines.push(`${prefix} ${opt}`);
      });
      return lines.join('\n');
    })
    .join('\n\n');
}

export function parseQuestions(body: string): QuestionData[] {
  const questions: QuestionData[] = [];
  // Normalize line endings (Windows \r\n → \n) before splitting
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/).filter((b) => b.trim().startsWith('>'));

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().startsWith('>'));
    if (lines.length < 2) continue;

    const questionText = lines[0].replace(/^>\s*/, '').trim();
    const options: string[] = [];
    let correctIndex = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/^>\s*/, '').trim();
      if (line.startsWith('*')) {
        correctIndex = options.length;
        options.push(line.replace(/^\*\s*/, '').trim());
      } else if (line.startsWith('-')) {
        options.push(line.replace(/^-\s*/, '').trim());
      } else {
        options.push(line);
      }
    }

    if (options.length > 0) {
      questions.push({ question: questionText, options, correctIndex });
    }
  }

  return questions;
}
