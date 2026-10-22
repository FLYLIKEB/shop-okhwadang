const COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_RE = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
const LENGTH_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em))$/;
const FONT_RE = /^(?:'[\w -]+'|"[\w -]+"|[\w -]+)(?:\s*,\s*(?:'[\w -]+'|"[\w -]+"|[\w -]+))*$/;
const NUMBER_RE = /^\d+(\.\d+)?$/;

export function isValidThemeCssValue(key: string, value: string): boolean {
  const trimmed = value.trim();
  if (key.startsWith('color_')) {
    const rgb = trimmed.match(RGB_RE);
    return COLOR_RE.test(trimmed) || Boolean(rgb && rgb.slice(1).every((channel) => Number(channel) <= 255));
  }
  if (key.startsWith('font_size')) return LENGTH_RE.test(trimmed) && parseFloat(trimmed) > 0;
  if (key.startsWith('spacing') || key.startsWith('radius')) return LENGTH_RE.test(trimmed);
  if (key.startsWith('font_family')) return FONT_RE.test(trimmed);
  if (key.startsWith('font_weight')) return NUMBER_RE.test(trimmed) && Number(trimmed) >= 1 && Number(trimmed) <= 1000;
  if (key.startsWith('line_height')) return NUMBER_RE.test(trimmed) && Number(trimmed) > 0;
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
