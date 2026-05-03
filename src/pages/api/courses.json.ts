import type { APIRoute } from 'astro';
import { listCourses } from '../../lib/course-manager';
import { isPublished } from '../../lib/publish-status';

export const GET: APIRoute = async () => {
  const courses = listCourses().filter((c) => isPublished(c.data));

  const data = courses.map((c) => ({
    slug: c.slug,
    title: c.data.title,
    description: c.data.description,
    category: c.data.category,
    difficulty: c.data.difficulty,
    tags: c.data.tags,
    moduleCount: c.data.modules.length,
    topicCount: c.data.modules.reduce((sum, m) => sum + m.topics.length, 0),
  }));

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
