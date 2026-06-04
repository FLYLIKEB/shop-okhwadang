const LEADING_HIERARCHY_MARKER_PATTERN = /^(?:\s*[ㄴ└]\s*)+/;

export function getHeaderNavigationLabel(label: string): string {
  return label.replace(LEADING_HIERARCHY_MARKER_PATTERN, '').trimStart();
}
