let sequence = 0;

export function e2eIdempotencyKey(operation: string): string {
  sequence += 1;
  return `e2e-${operation}-${Date.now()}-${sequence}`;
}
