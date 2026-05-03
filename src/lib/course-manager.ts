import fs from 'node:fs';
import path from 'node:path';

// ─── Types ────────────────────────────────────

export interface TopicData {
  slug: string;
  title: string;
  studyGuide: string;
  presentationUrl?: string;
  videoUrl?: string;
  order: number;
}

export interface ModuleData {
  slug: string;
  title: string;
  description: string;
  order: number;
  topics: TopicData[];
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

const SAFE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function validateSlug(slug: string): void {
  if (!slug || slug.length > 100) {
    throw new Error('Invalid slug: must be 1-100 characters');
  }
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new Error('Invalid slug: contains path traversal characters');
  }
  if (!SAFE_SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid slug: must contain only lowercase letters, numbers, and hyphens');
  }
}

export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);

  if (!slug) {
    return `untitled-${Date.now().toString(36)}`;
  }
  return slug;
}

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
