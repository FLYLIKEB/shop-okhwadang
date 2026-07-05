type DomPurifyLike = {
  sanitize: (html: string, options?: Record<string, unknown>) => string;
};

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'iframe',
  'img',
  'li',
  'ol',
  'p',
  'source',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'video',
];

const ALLOWED_ATTR = [
  'allow',
  'allowfullscreen',
  'alt',
  'class',
  'colspan',
  'controls',
  'data-linkdata',
  'data-linktype',
  'frameborder',
  'height',
  'href',
  'id',
  'lang',
  'loading',
  'loop',
  'muted',
  'playsinline',
  'poster',
  'rel',
  'rowspan',
  'src',
  'style',
  'target',
  'title',
  'type',
  'width',
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  'background-color',
  'border',
  'border-bottom',
  'border-color',
  'border-left',
  'border-right',
  'border-top',
  'border-width',
  'color',
  'display',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'min-height',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'vertical-align',
  'white-space',
  'width',
]);

const URL_STYLE_PATTERN = /url\s*\(|expression\s*\(|javascript:|data:/i;
const MEDIA_TAG_PATTERN = /<(img|iframe|video|source)\b/i;

function sanitizeInlineStyle(style: string): string {
  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return null;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (!ALLOWED_STYLE_PROPERTIES.has(property)) return null;
      if (!value || URL_STYLE_PATTERN.test(value)) return null;
      return `${property}: ${value}`;
    })
    .filter((declaration): declaration is string => Boolean(declaration))
    .join('; ');
}

function isSafeUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value, window.location.origin);
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'data:' && parsed.pathname.startsWith('image/'))
    );
  } catch {
    return false;
  }
}

function normalizeAfterSanitize(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const sanitized = sanitizeInlineStyle(element.getAttribute('style') ?? '');
    if (sanitized) element.setAttribute('style', sanitized);
    else element.removeAttribute('style');
  });

  template.content.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (!isSafeUrl(anchor.getAttribute('href'))) anchor.removeAttribute('href');
    if (anchor.target === '_blank') anchor.rel = 'noopener noreferrer';
  });

  template.content
    .querySelectorAll<HTMLImageElement | HTMLIFrameElement | HTMLVideoElement | HTMLSourceElement>(
      'img[src], iframe[src], video[src], source[src]',
    )
    .forEach((element) => {
      if (!isSafeUrl(element.getAttribute('src'))) element.removeAttribute('src');
    });

  template.content.querySelectorAll<HTMLIFrameElement>('iframe').forEach((iframe) => {
    iframe.setAttribute('loading', iframe.getAttribute('loading') || 'lazy');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  return template.innerHTML;
}

export function sanitizeProductDetailHtml(
  DOMPurify: DomPurifyLike,
  html: string | null | undefined,
): string {
  if (!html) return '';
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['referrerpolicy'],
  });
  return normalizeAfterSanitize(sanitized);
}

export function hasEmbeddedDetailMedia(html: string | null | undefined): boolean {
  return Boolean(html && MEDIA_TAG_PATTERN.test(html));
}
