/**
 * Course store + navigation helpers, backed by Supabase.
 *
 * Public API mirrors the previous filesystem implementation so callers
 * (admin actions, public course pages) keep working unchanged:
 *
 *   listCourses()                        → CourseItem[]
 *   readCourse(slug)                     → CourseItem | null
 *   writeCourse(slug, data)              → void
 *   deleteCourse(slug)                   → boolean
 *   courseExists(slug)                   → boolean
 *   getCourseNavSequence(slug, data)     → CourseNavStep[]   (pure)
 *   getPrevNext(sequence, currentUrl)    → { prev, next }    (pure)
 *
 * The full nested module → topic → questions tree is stored as JSONB in
 * the `courses.modules` column. The pre-write normalisation that fills in
 * missing slugs and sorts by `order` runs before insertion, exactly as it
 * did when writing JSON files.
 */

import { validateSlug, generateSlug as sharedGenerateSlug } from './slug';
import { getSupabaseAdmin, type CourseRow } from './supabase';

// ─── Types ────────────────────────────────────

export interface TopicData {
  slug: string;
  title: string;
  studyGuide: string;
  presentationUrl?: string;
  videoUrl?: string;
  order: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ModuleData {
  slug: string;
  title: string;
  description: string;
  order: number;
  topics: TopicData[];
  questions?: QuizQuestion[];
}

export interface CourseData {
  title: string;
  description: string;
  category: 'DevOps' | 'Cloud' | 'AI' | 'Security';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  modules: ModuleData[];
  status?: 'draft' | 'published';
}

export interface CourseItem {
  slug: string;
  data: CourseData;
}

export const generateSlug = sharedGenerateSlug;

// ─── Row ↔ CourseItem mapping ─────────────────

function rowToItem(row: CourseRow): CourseItem {
  return {
    slug: row.slug,
    data: {
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      tags: row.tags,
      modules: (row.modules as ModuleData[]) ?? [],
      status: row.status,
    },
  };
}

// Normalise modules + topics: fill in missing slugs from titles and sort
// every level by `order`. Pre-write sanitation, identical to what the
// FS-backed version did.
function normalizeModules(modules: ModuleData[]): ModuleData[] {
  return modules
    .map((mod, mi) => ({
      ...mod,
      slug: mod.slug || generateSlug(mod.title) || `module-${mi}`,
      order: mod.order ?? mi,
      topics: mod.topics
        .map((topic, ti) => ({
          ...topic,
          slug: topic.slug || generateSlug(topic.title) || `topic-${ti}`,
          order: topic.order ?? ti,
        }))
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

// ─── CRUD ─────────────────────────────────────

export async function listCourses(): Promise<CourseItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('courses')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw new Error(`listCourses: ${error.message}`);
  return (data as CourseRow[]).map(rowToItem);
}

export async function readCourse(slug: string): Promise<CourseItem | null> {
  validateSlug(slug);
  const { data, error } = await getSupabaseAdmin()
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`readCourse(${slug}): ${error.message}`);
  return data ? rowToItem(data as CourseRow) : null;
}

export async function writeCourse(slug: string, data: CourseData): Promise<void> {
  validateSlug(slug);

  const normalisedModules = normalizeModules(data.modules);

  const row = {
    slug,
    title: data.title,
    description: data.description,
    category: data.category,
    difficulty: data.difficulty,
    tags: data.tags,
    status: data.status ?? 'draft',
    modules: normalisedModules,
  };

  const { error } = await getSupabaseAdmin()
    .from('courses')
    .upsert(row, { onConflict: 'slug' });

  if (error) throw new Error(`writeCourse(${slug}): ${error.message}`);

  // Mutate caller's data so existing callers that read `data.modules` after
  // calling writeCourse keep seeing the normalised shape (matches the
  // FS-version behaviour).
  data.modules = normalisedModules;
}

export async function deleteCourse(slug: string): Promise<boolean> {
  validateSlug(slug);
  const { error, count } = await getSupabaseAdmin()
    .from('courses')
    .delete({ count: 'exact' })
    .eq('slug', slug);

  if (error) throw new Error(`deleteCourse(${slug}): ${error.message}`);
  return (count ?? 0) > 0;
}

export async function courseExists(slug: string): Promise<boolean> {
  validateSlug(slug);
  const { error, count } = await getSupabaseAdmin()
    .from('courses')
    .select('slug', { count: 'exact', head: true })
    .eq('slug', slug);

  if (error) throw new Error(`courseExists(${slug}): ${error.message}`);
  return (count ?? 0) > 0;
}

// ─── Navigation helpers (pure, unchanged) ─────

export type CourseNavStep =
  | {
      type: 'topic';
      moduleSlug: string;
      moduleTitle: string;
      topicSlug: string;
      title: string;
      url: string;
    }
  | {
      type: 'quiz';
      moduleSlug: string;
      moduleTitle: string;
      title: string;
      url: string;
    };

/**
 * Builds the flat ordered list a student walks through:
 * `topic, topic, ..., quiz(ifAny), topic, topic, ..., quiz(ifAny), ...`
 *
 * Modules without questions skip the quiz step so no empty quiz appears
 * in the sequence. Used by topic + quiz pages to compute previous/next.
 */
export function getCourseNavSequence(
  courseSlug: string,
  data: CourseData,
): CourseNavStep[] {
  const steps: CourseNavStep[] = [];
  for (const mod of data.modules) {
    for (const topic of mod.topics) {
      steps.push({
        type: 'topic',
        moduleSlug: mod.slug,
        moduleTitle: mod.title,
        topicSlug: topic.slug,
        title: topic.title,
        url: `/courses/${courseSlug}/${mod.slug}/${topic.slug}`,
      });
    }
    if (mod.questions && mod.questions.length > 0) {
      steps.push({
        type: 'quiz',
        moduleSlug: mod.slug,
        moduleTitle: mod.title,
        title: `${mod.title} Quiz`,
        url: `/courses/${courseSlug}/${mod.slug}/quiz`,
      });
    }
  }
  return steps;
}

/**
 * Returns `{ prev, next }` for a given step in the course navigation
 * sequence, identified by its URL path. Returns nulls at the ends.
 */
export function getPrevNext(
  sequence: CourseNavStep[],
  currentUrl: string,
): { prev: CourseNavStep | null; next: CourseNavStep | null } {
  const index = sequence.findIndex((s) => s.url === currentUrl);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? sequence[index - 1] : null,
    next: index < sequence.length - 1 ? sequence[index + 1] : null,
  };
}
