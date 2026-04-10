import type { APIRoute } from 'astro';
import { readContent, writeContent, deleteContent } from '../../../../lib/content-manager';

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

    const existing = readContent('blog', slug);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();
    const { title, description, author, category, tags, image, pubDate, body } = data;

    const validCategories = ['DevOps', 'Cloud', 'AI', 'Security'];
    if (category && !validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: 'Invalid category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const frontmatter: Record<string, unknown> = {
      title: title || existing.frontmatter.title,
      description: description || existing.frontmatter.description,
      pubDate: pubDate || existing.frontmatter.pubDate,
      author: author || existing.frontmatter.author,
      category: category || existing.frontmatter.category,
      tags: tags ?? existing.frontmatter.tags,
    };

    if (image !== undefined) {
      if (image) {
        frontmatter.image = image;
      }
    } else if (existing.frontmatter.image) {
      frontmatter.image = existing.frontmatter.image;
    }

    const updatedBody = body !== undefined ? body : existing.body;

    writeContent('blog', slug, frontmatter, updatedBody);

    return new Response(JSON.stringify({ success: true, slug }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update post';
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

    const deleted = deleteContent('blog', slug);
    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete post';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
