import type { APIRoute } from 'astro';
import { writeContent, generateSlug, contentExists, serializeQuestions } from '../../../../lib/content-manager';
import type { QuestionData } from '../../../../lib/content-manager';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { title, description, category, difficulty, timeLimit, passingScore, tags, questions } = data;

    if (!title || !description || !category || !difficulty) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = ['DevOps', 'Cloud', 'AI', 'Security'];
    const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];

    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: 'Invalid category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!validDifficulties.includes(difficulty)) {
      return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let slug = generateSlug(title);
    if (contentExists('tests', slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const frontmatter: Record<string, unknown> = {
      title,
      description,
      category,
      difficulty,
      passingScore: passingScore || 70,
      tags: tags || [],
    };

    if (timeLimit) {
      frontmatter.timeLimit = Number(timeLimit);
    }

    const body = serializeQuestions(questions as QuestionData[]);
    writeContent('tests', slug, frontmatter, body);

    return new Response(JSON.stringify({ success: true, slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create test';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
