import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('CloudNative Atlas Team'),
    category: z.enum(['DevOps', 'Cloud', 'AI', 'Security']),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

const tests = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/tests' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['DevOps', 'Cloud', 'AI', 'Security']),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    timeLimit: z.number().int().positive().optional(),
    passingScore: z.number().int().min(0).max(100).default(70),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

const topicSchema = z.object({
  slug: z.string(),
  title: z.string(),
  studyGuide: z.string().default(''),
  presentationUrl: z.url().optional().or(z.literal('')),
  videoUrl: z.url().optional().or(z.literal('')),
  order: z.number().int().min(0).default(0),
});

const moduleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().default(''),
  order: z.number().int().min(0).default(0),
  topics: z.array(topicSchema).default([]),
});

const courses = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['DevOps', 'Cloud', 'AI', 'Security']),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    tags: z.array(z.string()).default([]),
    modules: z.array(moduleSchema).default([]),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

export const collections = { blog, tests, courses };
