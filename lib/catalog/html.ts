const ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'u',
  'ul',
]);

const VOID_HTML_TAGS = new Set(['br', 'hr']);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function getAllowedHref(attributes: string) {
  const match = attributes.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();

  if (!href) {
    return null;
  }

  if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
    return href;
  }

  return null;
}

export function containsHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function plainTextToHtml(value: string) {
  return value
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function sanitizeProductHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:style|class|id|srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTag: string, attributes: string) => {
      const tag = rawTag.toLocaleLowerCase('tr');
      const isClosingTag = match.startsWith('</');

      if (!ALLOWED_HTML_TAGS.has(tag)) {
        return '';
      }

      if (isClosingTag) {
        return VOID_HTML_TAGS.has(tag) ? '' : `</${tag}>`;
      }

      if (tag === 'a') {
        const href = getAllowedHref(attributes);
        return href ? `<a href="${escapeAttribute(href)}" rel="noopener noreferrer">` : '<a>';
      }

      return VOID_HTML_TAGS.has(tag) ? `<${tag}>` : `<${tag}>`;
    })
    .trim();
}

export function normalizeProductHtml(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  return containsHtml(trimmedValue) ? sanitizeProductHtml(trimmedValue) : plainTextToHtml(trimmedValue);
}

export function productDescriptionHtml(value: string, fallback = '') {
  return normalizeProductHtml(value || fallback);
}
