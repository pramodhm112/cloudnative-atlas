import { describe, it, expect } from 'vitest';
import {
  BlogCreateSchema,
  BlogUpdateSchema,
  ProjectCreateSchema,
  TestCreateSchema,
  CourseCreateSchema,
  StatusEnum,
  CategoryEnum,
  DifficultyEnum,
} from '../admin-schemas';

describe('shared enums', () => {
  it('CategoryEnum accepts only the four allowed categories', () => {
    expect(CategoryEnum.safeParse('DevOps').success).toBe(true);
    expect(CategoryEnum.safeParse('Cloud').success).toBe(true);
    expect(CategoryEnum.safeParse('AI').success).toBe(true);
    expect(CategoryEnum.safeParse('Security').success).toBe(true);
    expect(CategoryEnum.safeParse('Other').success).toBe(false);
    expect(CategoryEnum.safeParse('devops').success).toBe(false); // case-sensitive
  });

  it('DifficultyEnum accepts only Beginner/Intermediate/Advanced', () => {
    expect(DifficultyEnum.safeParse('Beginner').success).toBe(true);
    expect(DifficultyEnum.safeParse('Expert').success).toBe(false);
  });

  it('StatusEnum accepts only draft/published', () => {
    expect(StatusEnum.safeParse('draft').success).toBe(true);
    expect(StatusEnum.safeParse('published').success).toBe(true);
    expect(StatusEnum.safeParse('Draft').success).toBe(false);
  });
});

describe('BlogCreateSchema — happy path', () => {
  it('accepts a minimal valid body', () => {
    const result = BlogCreateSchema.safeParse({
      title: 'Hello',
      description: 'World',
      category: 'DevOps',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]); // default
      expect(result.data.body).toBe(''); // default
    }
  });

  it('accepts a fully-populated body', () => {
    const result = BlogCreateSchema.safeParse({
      title: 'Hello',
      description: 'World',
      category: 'AI',
      author: 'Jane',
      tags: ['a', 'b'],
      image: '/img.png',
      body: '# content',
      status: 'draft',
    });
    expect(result.success).toBe(true);
  });
});

describe('BlogCreateSchema — error paths', () => {
  it('rejects empty title', () => {
    const result = BlogCreateSchema.safeParse({
      title: '',
      description: 'x',
      category: 'AI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const result = BlogCreateSchema.safeParse({ title: 'x', category: 'AI' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown category', () => {
    const result = BlogCreateSchema.safeParse({
      title: 'x',
      description: 'y',
      category: 'Quantum',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['category']);
    }
  });
});

describe('BlogUpdateSchema — partial updates', () => {
  it('accepts updates with just one field', () => {
    expect(BlogUpdateSchema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(BlogUpdateSchema.safeParse({ title: 'New' }).success).toBe(true);
    expect(BlogUpdateSchema.safeParse({}).success).toBe(true); // empty object = no-op update is valid
  });

  it('still rejects invalid values when present', () => {
    expect(BlogUpdateSchema.safeParse({ category: 'Bad' }).success).toBe(false);
    expect(BlogUpdateSchema.safeParse({ status: 'archived' }).success).toBe(false);
    expect(BlogUpdateSchema.safeParse({ title: '' }).success).toBe(false); // min(1)
  });
});

describe('ProjectCreateSchema', () => {
  it('requires title, description, category, and difficulty', () => {
    const result = ProjectCreateSchema.safeParse({
      title: 'Proj',
      description: 'd',
      category: 'Cloud',
      difficulty: 'Intermediate',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when difficulty is missing', () => {
    expect(
      ProjectCreateSchema.safeParse({
        title: 'p',
        description: 'd',
        category: 'Cloud',
      }).success
    ).toBe(false);
  });
});

describe('TestCreateSchema', () => {
  it('requires at least one question with at least 2 options', () => {
    expect(
      TestCreateSchema.safeParse({
        title: 't',
        description: 'd',
        category: 'AI',
        difficulty: 'Beginner',
        questions: [
          { question: 'Q?', options: ['a', 'b'], correctIndex: 0 },
        ],
      }).success
    ).toBe(true);
  });

  it('rejects when questions array is empty', () => {
    expect(
      TestCreateSchema.safeParse({
        title: 't',
        description: 'd',
        category: 'AI',
        difficulty: 'Beginner',
        questions: [],
      }).success
    ).toBe(false);
  });

  it('rejects a question with only 1 option', () => {
    expect(
      TestCreateSchema.safeParse({
        title: 't',
        description: 'd',
        category: 'AI',
        difficulty: 'Beginner',
        questions: [{ question: 'Q?', options: ['only'], correctIndex: 0 }],
      }).success
    ).toBe(false);
  });
});

describe('CourseCreateSchema', () => {
  it('accepts a minimal course (no modules)', () => {
    const result = CourseCreateSchema.safeParse({
      title: 'C',
      description: 'd',
      category: 'AI',
      difficulty: 'Beginner',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a course with nested modules + topics + questions', () => {
    const result = CourseCreateSchema.safeParse({
      title: 'C',
      description: 'd',
      category: 'AI',
      difficulty: 'Beginner',
      modules: [
        {
          slug: 'm1',
          title: 'M1',
          description: 'first',
          order: 0,
          topics: [
            { slug: 't1', title: 'T1', studyGuide: '# hi', order: 0 },
          ],
          questions: [
            { question: 'Q?', options: ['a', 'b'], correctIndex: 0 },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a module with a question whose correctIndex is negative', () => {
    const result = CourseCreateSchema.safeParse({
      title: 'C',
      description: 'd',
      category: 'AI',
      difficulty: 'Beginner',
      modules: [
        {
          slug: 'm1',
          title: 'M1',
          description: 'first',
          order: 0,
          topics: [],
          questions: [
            { question: 'Q?', options: ['a', 'b'], correctIndex: -1 },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
