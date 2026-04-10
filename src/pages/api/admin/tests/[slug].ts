import type { APIRoute } from 'astro';
import { readContent, writeContent, deleteContent, serializeQuestions } from '../../../../lib/content-manager';
import type { QuestionData } from '../../../../lib/content-manager';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { slug } = params;
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = readContent('tests', slug);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Test not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();
    const { title, description, category, difficulty, timeLimit, passingScore, tags, questions } = data;

    const frontmatter: Record<string, unknown> = {
      title: title || existing.frontmatter.title,
      description: description || existing.frontmatter.description,
      category: category || existing.frontmatter.category,
      difficulty: difficulty || existing.frontmatter.difficulty,
      passingScore: passingScore ?? existing.frontmatter.passingScore,
      tags: tags ?? existing.frontmatter.tags,
    };

    if (timeLimit !== undefined) {
      if (timeLimit) {
        frontmatter.timeLimit = Number(timeLimit);
      }
    } else if (existing.frontmatter.timeLimit) {
      frontmatter.timeLimit = existing.frontmatter.timeLimit;
    }

    let body = existing.body;
    if (questions && Array.isArray(questions) && questions.length > 0) {
      body = serializeQuestions(questions as QuestionData[]);
    }

    writeContent('tests', slug, frontmatter, body);

    return new Response(JSON.stringify({ success: true, slug }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update test';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { slug } = params;
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = deleteContent('tests', slug);
    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Test not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete test';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
