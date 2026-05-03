import fs from 'node:fs';
import path from 'node:path';
import { validateSlug, generateSlug as sharedGenerateSlug } from './slug';

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

// ─── Slug validation ──────────────────────────

/** Re-exported from lib/slug for backwards compatibility. */
export const generateSlug = sharedGenerateSlug;

// ─── Directory ────────────────────────────────

function getCoursesDir(): string {
  return path.join(process.cwd(), 'src', 'content', 'courses');
}

// ─── CRUD Operations ──────────────────────────

export function listCourses(): CourseItem[] {
  const dir = getCoursesDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as CourseData;
    return {
      slug: file.replace('.json', ''),
      data,
    };
  });
}

export function readCourse(slug: string): CourseItem | null {
  validateSlug(slug);
  const filePath = path.join(getCoursesDir(), `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as CourseData;
  return { slug, data };
}

export function writeCourse(slug: string, data: CourseData): void {
  validateSlug(slug);
  const dir = getCoursesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Ensure modules and topics have valid slugs and are sorted by order
  data.modules = data.modules
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

  fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function deleteCourse(slug: string): boolean {
  validateSlug(slug);
  const filePath = path.join(getCoursesDir(), `${slug}.json`);
  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  return true;
}

export function courseExists(slug: string): boolean {
  validateSlug(slug);
  return fs.existsSync(path.join(getCoursesDir(), `${slug}.json`));
}

// ─── Navigation sequence ──────────────────────

/**
 * A single stop in the linear learning flow of a course.
 * Either a study topic or a module-end quiz.
 */
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
 * Modules without questions skip the quiz step so no empty quiz appears in
 * the sequence. Used by topic + quiz pages to compute previous/next.
 */
export function getCourseNavSequence(
  courseSlug: string,
  data: CourseData
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
 * Returns `{ prev, next }` for a given step in the course navigation sequence,
 * identified by its URL path. Returns nulls at the ends of the course.
 */
export function getPrevNext(
  sequence: CourseNavStep[],
  currentUrl: string
): { prev: CourseNavStep | null; next: CourseNavStep | null } {
  const index = sequence.findIndex((s) => s.url === currentUrl);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? sequence[index - 1] : null,
    next: index < sequence.length - 1 ? sequence[index + 1] : null,
  };
}
