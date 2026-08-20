export type ClayKey = 'zuni' | 'danni' | 'zini' | 'heukni' | 'chunsuni' | 'nokni';

const CLAY_ALIASES: Record<ClayKey, readonly string[]> = {
  zuni: ['주니', '朱泥', 'zuni', 'zhuni'],
  danni: ['단니', '段泥', 'danni', 'duanni'],
  zini: ['자니', '紫泥', 'zini', 'zisha'],
  heukni: ['흑니', '黑泥', 'heukni', 'heini'],
  chunsuni: ['청수니', '靑水泥', '清水泥', 'chunsuni', 'qingshuini'],
  nokni: ['녹니', '綠泥', '绿泥', 'nokni', 'luni'],
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function normalizeClayKey(value: string | null | undefined): ClayKey | null {
  if (!value) return null;

  const normalized = normalizeSearchValue(value);
  if (!normalized) return null;

  for (const [key, aliases] of Object.entries(CLAY_ALIASES) as Array<[ClayKey, readonly string[]]>) {
    if (aliases.some((alias) => normalized.includes(normalizeSearchValue(alias)))) {
      return key;
    }
  }

  return null;
}

export const CLAY_KEYS = Object.freeze(Object.keys(CLAY_ALIASES) as ClayKey[]);
