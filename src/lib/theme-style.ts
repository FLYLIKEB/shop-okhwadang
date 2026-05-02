const COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
const LENGTH_RE = /^\d+(\.\d+)?(px|rem|em)$/;
const FONT_RE = /^['"]?[\w\s,-]+['"]?(?:\s*,\s*[\w\s-]+)*$/;
const NUMBER_RE = /^\d+(\.\d+)?$/;

function isValidThemeCssValue(key: string, value: string): boolean {
  const trimmed = value.trim();
  if (key.startsWith('color_')) return COLOR_RE.test(trimmed);
  if (key.startsWith('font_size') || key.startsWith('spacing') || key.startsWith('radius')) return LENGTH_RE.test(trimmed);
  if (key.startsWith('font_family')) return FONT_RE.test(trimmed);
  if (key.startsWith('font_weight') || key.startsWith('line_height')) return NUMBER_RE.test(trimmed);
  return false;
}

export function getThemeStyle(map: Record<string, string> | null): string {
  if (!map) return '';

  const lightVars: string[] = [];
  const darkVars: string[] = [];

  for (const [k, v] of Object.entries(map)) {
    if (!isValidThemeCssValue(k, String(v))) continue;
    const safeKey = k.replace(/[^a-zA-Z0-9_-]/g, '');
    const cssVar = `--db-${safeKey.replace(/_/g, '-')}: ${String(v).trim()}`;
    if (k.startsWith('color_dark_')) {
      darkVars.push(cssVar);
    } else {
      lightVars.push(cssVar);
    }
  }

  const parts: string[] = [];
  if (lightVars.length > 0) parts.push(`:root { ${lightVars.join('; ')} }`);
  if (darkVars.length > 0) parts.push(`[data-theme="dark"] { ${darkVars.join('; ')} }`);
  return parts.join('\n');
}
