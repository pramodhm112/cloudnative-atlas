import type { APIRoute } from 'astro';
import { writeContent, generateSlug, contentExists } from '../../../../lib/content-manager';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const { title, description, author, category, tags, image, body } = data;

    if (!title || !description || !category) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = ['DevOps', 'Cloud', 'AI', 'Security'];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: 'Invalid category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let slug = generateSlug(title);

    // Handle slug conflicts
    if (contentExists('blog', slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const frontmatter: Record<string, unknown> = {
      title,
      description,
      pubDate: new Date().toISOString().split('T')[0],
      author: author || 'CloudNative Atlas Team',
      category,
      tags: tags || [],
    };

    if (image) {
      frontmatter.image = image;
    }

    writeContent('blog', slug, frontmatter, body || '');

    return new Response(JSON.stringify({ success: true, slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create post';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
