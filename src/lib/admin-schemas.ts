/**
 * Zod schemas for admin API request bodies.
 *
 * Each collection has a "create" schema (strict — required fields must be present)
 * and an "update" schema (partial — any field may be omitted and will fall back
 * to the existing value).
 */

import { z } from 'zod';

// --- Shared enums ---------------------------------------------------------

export const CategoryEnum = z.enum(['DevOps', 'Cloud', 'AI', 'Security']);
export const DifficultyEnum = z.enum(['Beginner', 'Intermediate', 'Advanced']);
export const StatusEnum = z.enum(['draft', 'published']);

// --- Blog -----------------------------------------------------------------

export const BlogCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: CategoryEnum,
  author: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  image: z.string().optional(),
  body: z.string().optional().default(''),
  status: StatusEnum.optional(),
});

export const BlogUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: CategoryEnum.optional(),
  author: z.string().optional(),
  pubDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
  body: z.string().optional(),
  status: StatusEnum.optional(),
});

// --- Projects -------------------------------------------------------------

export const ProjectCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: CategoryEnum,
  difficulty: DifficultyEnum,
  author: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  technologies: z.array(z.string()).optional().default([]),
  sourceUrl: z.string().optional(),
  image: z.string().optional(),
  body: z.string().optional().default(''),
  status: StatusEnum.optional(),
});

export const ProjectUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: CategoryEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  author: z.string().optional(),
  pubDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  sourceUrl: z.string().optional(),
  image: z.string().optional(),
  body: z.string().optional(),
  status: StatusEnum.optional(),
});

// --- Tests ----------------------------------------------------------------

export const QuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

export const TestCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: CategoryEnum,
  difficulty: DifficultyEnum,
  timeLimit: z.number().int().positive().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional().default([]),
  questions: z.array(QuestionSchema).min(1),
  status: StatusEnum.optional(),
});

export const TestUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: CategoryEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  timeLimit: z.number().int().positive().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  questions: z.array(QuestionSchema).optional(),
  status: StatusEnum.optional(),
});

// --- Courses --------------------------------------------------------------

export const TopicSchema = z.object({
  slug: z.string(),
  title: z.string().min(1),
  studyGuide: z.string(),
  presentationUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  order: z.number(),
});

export const ModuleSchema = z.object({
  slug: z.string(),
  title: z.string().min(1),
  description: z.string(),
  order: z.number(),
  topics: z.array(TopicSchema),
  questions: z.array(QuestionSchema).optional().default([]),
});

export const CourseCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: CategoryEnum,
  difficulty: DifficultyEnum,
  tags: z.array(z.string()).optional().default([]),
  modules: z.array(ModuleSchema).optional().default([]),
  status: StatusEnum.optional(),
});

export const CourseUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: CategoryEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  tags: z.array(z.string()).optional(),
  modules: z.array(ModuleSchema).optional(),
  status: StatusEnum.optional(),
});

// --- Inferred TS types ----------------------------------------------------

export type BlogCreate = z.infer<typeof BlogCreateSchema>;
export type BlogUpdate = z.infer<typeof BlogUpdateSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type TestCreate = z.infer<typeof TestCreateSchema>;
export type TestUpdate = z.infer<typeof TestUpdateSchema>;
export type CourseCreate = z.infer<typeof CourseCreateSchema>;
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>;
