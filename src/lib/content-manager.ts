import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Resolve content directories relative to the project root
function getContentDir(collection: 'blog' | 'tests'): string {
  const root = process.cwd();
  return path.join(root, 'src', 'content', collection);
}

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
}

export interface TestFrontmatter {
  title: string;
  description: string;
  category: 'DevOps' | 'Cloud' | 'AI' | 'Security';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeLimit?: number;
  passingScore: number;
  tags: string[];
}

export interface QuestionData {
  question: string;
  options: string[];
  correctIndex: number;
}

// --- File operations ---

export function listContent(collection: 'blog' | 'tests'): ContentItem[] {
  const dir = getContentDir(collection);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  return files.map((file) => {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return {
      slug: file.replace('.mdx', ''),
      frontmatter: data,
      body: content.trim(),
    };
  });
}

export function readContent(collection: 'blog' | 'tests', slug: string): ContentItem | null {
  const filePath = path.join(getContentDir(collection), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug,
    frontmatter: data,
    body: content.trim(),
  };
}

export function writeContent(
  collection: 'blog' | 'tests',
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string
): void {
  const dir = getContentDir(collection);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = matter.stringify(`\n${body}\n`, frontmatter);
  fs.writeFileSync(path.join(dir, `${slug}.mdx`), content, 'utf-8');
}

export function deleteContent(collection: 'blog' | 'tests', slug: string): boolean {
  const filePath = path.join(getContentDir(collection), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  return true;
}

export function contentExists(collection: 'blog' | 'tests', slug: string): boolean {
  return fs.existsSync(path.join(getContentDir(collection), `${slug}.mdx`));
}

// --- Slug generation ---

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// --- Question format serialization ---

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
  const blocks = body.split(/\n\n+/).filter((b) => b.trim().startsWith('>'));

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
