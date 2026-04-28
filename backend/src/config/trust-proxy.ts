/**
 * Express `trust proxy` 값 결정.
 * - TRUST_PROXY 명시 시 숫자(hop count) 또는 boolean 문자열("true"/"false") 허용
 * - 미설정 시 production=1, 그 외=false (직접 노출된 dev 환경에서 X-Forwarded-For 스푸핑 차단)
 */
export function resolveTrustProxy(
  raw: string | undefined,
  nodeEnv: string | undefined,
): number | boolean {
  if (raw !== undefined) {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    const hops = Number(trimmed);
    if (Number.isInteger(hops) && hops >= 0) return hops;
  }
  return nodeEnv === 'production' ? 1 : false;
}
