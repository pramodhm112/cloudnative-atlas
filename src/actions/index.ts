import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import {
  writeContent,
  readContent,
  deleteContent,
  generateSlug,
  contentExists,
  serializeQuestions,
} from '../lib/content-manager';
import {
  writeCourse,
  readCourse,
  deleteCourse,
  generateSlug as generateCourseSlug,
  courseExists,
} from '../lib/course-manager';
import type { CourseData } from '../lib/course-manager';
import { writeSettings } from '../lib/settings-manager';

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid slug');
const categorySchema = z.enum(['DevOps', 'Cloud', 'AI', 'Security']);
const difficultySchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
const statusSchema = z.enum(['draft', 'published']);

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)),
  correctIndex: z.number().int().min(0),
});

const topicInputSchema = z.object({
  slug: z.string(),
  title: z.string(),
  studyGuide: z.string().default(''),
  presentationUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  order: z.number().int().min(0),
});

const moduleInputSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().default(''),
  order: z.number().int().min(0),
  topics: z.array(topicInputSchema).default([]),
});

export const server = {
  posts: {
    create: defineAction({
      input: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        author: z.string().optional(),
        category: categorySchema,
        tags: z.array(z.string()).default([]),
        image: z.string().optional(),
        body: z.string().default(''),
        status: statusSchema.default('draft'),
      }),
      handler: async (input) => {
        let slug = generateSlug(input.title);
        if (contentExists('blog', slug)) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }
        const frontmatter: Record<string, unknown> = {
          title: input.title,
          description: input.description,
          pubDate: new Date().toISOString().split('T')[0],
          author: input.author || 'CloudNative Atlas Team',
          category: input.category,
          tags: input.tags,
          status: input.status,
        };
        if (input.image) frontmatter.image = input.image;
        writeContent('blog', slug, frontmatter, input.body);
        return { slug };
      },
    }),

    update: defineAction({
      input: z.object({
        slug: slugSchema,
        title: z.string().optional(),
        description: z.string().optional(),
        author: z.string().optional(),
        category: categorySchema.optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        pubDate: z.string().optional(),
        body: z.string().optional(),
        status: statusSchema.optional(),
      }),
      handler: async (input) => {
        const existing = readContent('blog', input.slug);
        if (!existing) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Post not found' });
        }
        const frontmatter: Record<string, unknown> = {
          title: input.title || existing.frontmatter.title,
          description: input.description || existing.frontmatter.description,
          pubDate: input.pubDate || existing.frontmatter.pubDate,
          author: input.author || existing.frontmatter.author,
          category: input.category || existing.frontmatter.category,
          tags: input.tags ?? existing.frontmatter.tags,
          status: input.status ?? existing.frontmatter.status ?? 'published',
        };
        if (input.image !== undefined) {
          if (input.image) frontmatter.image = input.image;
        } else if (existing.frontmatter.image) {
          frontmatter.image = existing.frontmatter.image;
        }
        const updatedBody = input.body !== undefined ? input.body : existing.body;
        writeContent('blog', input.slug, frontmatter, updatedBody);
        return { slug: input.slug };
      },
    }),

    delete: defineAction({
      input: z.object({ slug: slugSchema }),
      handler: async ({ slug }) => {
        const deleted = deleteContent('blog', slug);
        if (!deleted) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Post not found' });
        }
        return { success: true };
      },
    }),
  },

  tests: {
    create: defineAction({
      input: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        category: categorySchema,
        difficulty: difficultySchema,
        timeLimit: z.union([z.number(), z.string(), z.null()]).optional(),
        passingScore: z.number().int().min(0).max(100).default(70),
        tags: z.array(z.string()).default([]),
        questions: z.array(questionSchema).min(1, 'At least one question is required'),
        status: statusSchema.default('draft'),
      }),
      handler: async (input) => {
        let slug = generateSlug(input.title);
        if (contentExists('tests', slug)) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }
        const frontmatter: Record<string, unknown> = {
          title: input.title,
          description: input.description,
          category: input.category,
          difficulty: input.difficulty,
          passingScore: input.passingScore,
          tags: input.tags,
          status: input.status,
        };
        if (input.timeLimit != null && input.timeLimit !== '') {
          const numLimit = Number(input.timeLimit);
          if (!isNaN(numLimit) && numLimit > 0) {
            frontmatter.timeLimit = numLimit;
          }
        }
        const body = serializeQuestions(input.questions);
        writeContent('tests', slug, frontmatter, body);
        return { slug };
      },
    }),

    update: defineAction({
      input: z.object({
        slug: slugSchema,
        title: z.string().optional(),
        description: z.string().optional(),
        category: categorySchema.optional(),
        difficulty: difficultySchema.optional(),
        timeLimit: z.union([z.number(), z.string(), z.null()]).optional(),
        passingScore: z.number().int().min(0).max(100).optional(),
        tags: z.array(z.string()).optional(),
        questions: z.array(questionSchema).optional(),
        status: statusSchema.optional(),
      }),
      handler: async (input) => {
        const existing = readContent('tests', input.slug);
        if (!existing) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Test not found' });
        }
        const frontmatter: Record<string, unknown> = {
          title: input.title || existing.frontmatter.title,
          description: input.description || existing.frontmatter.description,
          category: input.category || existing.frontmatter.category,
          difficulty: input.difficulty || existing.frontmatter.difficulty,
          passingScore: input.passingScore ?? existing.frontmatter.passingScore,
          tags: input.tags ?? existing.frontmatter.tags,
          status: input.status ?? existing.frontmatter.status ?? 'published',
        };
        if (input.timeLimit !== undefined) {
          if (input.timeLimit != null && input.timeLimit !== '') {
            const numLimit = Number(input.timeLimit);
            if (!isNaN(numLimit) && numLimit > 0) {
              frontmatter.timeLimit = numLimit;
            }
          }
        } else if (existing.frontmatter.timeLimit) {
          frontmatter.timeLimit = existing.frontmatter.timeLimit;
        }
        let body = existing.body;
        if (input.questions && input.questions.length > 0) {
          body = serializeQuestions(input.questions);
        }
        writeContent('tests', input.slug, frontmatter, body);
        return { slug: input.slug };
      },
    }),

    delete: defineAction({
      input: z.object({ slug: slugSchema }),
      handler: async ({ slug }) => {
        const deleted = deleteContent('tests', slug);
        if (!deleted) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Test not found' });
        }
        return { success: true };
      },
    }),
  },

  courses: {
    create: defineAction({
      input: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        category: categorySchema,
        difficulty: difficultySchema,
        tags: z.array(z.string()).default([]),
        modules: z.array(moduleInputSchema).default([]),
        status: statusSchema.default('draft'),
      }),
      handler: async (input) => {
        let slug = generateCourseSlug(input.title);
        if (courseExists(slug)) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }
        const courseData: CourseData = {
          title: input.title,
          description: input.description,
          category: input.category,
          difficulty: input.difficulty,
          tags: input.tags,
          modules: input.modules,
          status: input.status,
        };
        writeCourse(slug, courseData);
        return { slug };
      },
    }),

    update: defineAction({
      input: z.object({
        slug: slugSchema,
        title: z.string().optional(),
        description: z.string().optional(),
        category: categorySchema.optional(),
        difficulty: difficultySchema.optional(),
        tags: z.array(z.string()).optional(),
        modules: z.array(moduleInputSchema).optional(),
        status: statusSchema.optional(),
      }),
      handler: async (input) => {
        const existing = readCourse(input.slug);
        if (!existing) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Course not found' });
        }
        const courseData: CourseData = {
          title: input.title || existing.data.title,
          description: input.description || existing.data.description,
          category: input.category || existing.data.category,
          difficulty: input.difficulty || existing.data.difficulty,
          tags: input.tags ?? existing.data.tags,
          modules: input.modules ?? existing.data.modules,
          status: input.status ?? existing.data.status ?? 'published',
        };
        writeCourse(input.slug, courseData);
        return { slug: input.slug };
      },
    }),

    delete: defineAction({
      input: z.object({ slug: slugSchema }),
      handler: async ({ slug }) => {
        const deleted = deleteCourse(slug);
        if (!deleted) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Course not found' });
        }
        return { success: true };
      },
    }),
  },

  settings: {
    update: defineAction({
      input: z.object({
        enablePresentations: z.boolean().optional(),
        enableVideos: z.boolean().optional(),
      }),
      handler: async (input) => {
        return writeSettings(input);
      },
    }),
  },
};
