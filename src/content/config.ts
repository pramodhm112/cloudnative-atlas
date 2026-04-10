import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('CloudNative Atlas Team'),
    category: z.enum(['DevOps', 'Cloud', 'AI', 'Security']),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});

const tests = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['DevOps', 'Cloud', 'AI', 'Security']),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    timeLimit: z.number().int().positive().optional(),
    passingScore: z.number().int().min(0).max(100).default(70),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, tests };
