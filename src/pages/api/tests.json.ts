import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const tests = await getCollection('tests');

  const testsData = tests.map(test => ({
    slug: test.slug,
    title: test.data.title,
    description: test.data.description,
    category: test.data.category,
    difficulty: test.data.difficulty,
    tags: test.data.tags,
    timeLimit: test.data.timeLimit,
    passingScore: test.data.passingScore,
  }));

  return new Response(JSON.stringify(testsData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
