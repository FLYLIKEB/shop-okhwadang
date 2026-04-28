export type TransitionMap<TState extends string> = Record<TState, readonly TState[]>;

export function isTransitionAllowed<TState extends string>(
  transitions: TransitionMap<TState>,
  current: TState,
  next: TState,
  options?: { allowSameStatus?: boolean },
): boolean {
  if (options?.allowSameStatus && current === next) {
    return true;
  }

  const allowed = transitions[current] ?? [];
  return allowed.includes(next);
}

export function formatInvalidTransitionMessage(
  current: string,
  next: string,
): string {
  return `상태 전이가 허용되지 않습니다: ${current} → ${next}`;
}
