import { marked, Renderer } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Strip any src/href that isn't an http(s), root-relative, or fragment URL.
// DOMPurify's default URI allow-list lets data: URIs through on <img>;
// this hook closes that gap for good.
const SAFE_URL = /^(?:https?:\/\/|\/|#|mailto:|tel:)/i;
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if ((data.attrName === 'src' || data.attrName === 'href') && data.attrValue) {
    if (!SAFE_URL.test(data.attrValue)) {
      data.keepAttr = false;
    }
  }
});

// Anti-tabnabbing: any <a target="_blank"> emitted by marked or written by
// hand in markdown gets a forced rel="noopener noreferrer". This prevents
// the destination page from accessing window.opener and from being able
// to phish back into our origin via a fake document.referrer.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && (node as Element).getAttribute('target') === '_blank') {
    (node as Element).setAttribute('rel', 'noopener noreferrer');
  }
});

// Custom renderer that escapes raw HTML in markdown source as a first defense layer.
const renderer = new Renderer();
renderer.html = function ({ text }: { text: string }): string {
  return `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
});

marked.use({ renderer });

/**
 * Allowed HTML tags and attributes for sanitized output. Keeps the set
 * minimal: headings, text formatting, lists, links, images, code blocks,
 * and quotation — plus class attributes for syntax-highlight styling.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark',
    'ul', 'ol', 'li',
    'a', 'img',
    'code', 'pre', 'kbd', 'samp',
    'blockquote', 'q',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel'],
  // Only permit http(s), mailto, tel, and root-relative URLs. Blocks
  // javascript:, data:, vbscript:, file: and any other URI scheme.
  ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:|tel:|\/|#)/i,
};

/**
 * Renders a markdown string to sanitized HTML.
 *
 * Used for study guide content stored as strings in course JSON files.
 * Defense in depth: (1) raw HTML blocks in markdown source are escaped
 * before `marked` runs, (2) the resulting HTML is passed through DOMPurify
 * with a strict allow-list before returning.
 */
export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return '';
  const rawHtml = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
}

/**
 * Removes the leading `#`/`##`/`###` heading from markdown if its text
 * matches (or closely resembles) `title`. Used to avoid rendering a course
 * topic title twice — once as the page heading and once as the first line
 * of the study guide body. Case-insensitive; tolerates trailing punctuation.
 */
export function stripLeadingTitle(md: string, title: string): string {
  if (!md || !title) return md ?? '';
  const lines = md.replace(/^\s+/, '').split('\n');
  if (lines.length === 0) return md;

  const first = lines[0].trim();
  const headingMatch = /^(#{1,3})\s+(.+?)\s*$/.exec(first);
  if (!headingMatch) return md;

  const normalize = (s: string) => s.toLowerCase().replace(/[?!.]+$/, '').trim();
  if (normalize(headingMatch[2]) !== normalize(title)) return md;

  // Drop the heading and any blank lines right after it
  let i = 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  return lines.slice(i).join('\n');
}
