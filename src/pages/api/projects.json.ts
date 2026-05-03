import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isPublished } from '../../lib/publish-status';

export const GET: APIRoute = async () => {
  try {
    const projects = (await getCollection('projects')).filter((p) => isPublished(p.data));

    const data = projects.map((project) => ({
      // Content Layer API — entry.id is the slug-shaped path
      slug: project.id,
      title: project.data.title,
      description: project.data.description,
      pubDate: project.data.pubDate,
      category: project.data.category,
      difficulty: project.data.difficulty,
      tags: project.data.tags,
      technologies: project.data.technologies,
      sourceUrl: project.data.sourceUrl,
      author: project.data.author,
    })).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
