export function handleApiError(err: unknown, fallback = '오류가 발생했습니다.'): string {
  return err instanceof Error ? err.message : fallback;
}
