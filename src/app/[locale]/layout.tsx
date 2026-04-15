import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from 'next-intl/server';
import KoShell from '@/components/ko/KoShell';
import EnShell from '@/components/en/EnShell';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { fetchSettingsMap } from '@/lib/api-server';
import { SITE_URL } from '@/lib/site-url';

const SUPPORTED_LOCALES = ['ko', 'en'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${SITE_URL}/${loc}`;
  }
  languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}`;

  return {
    alternates: {
      canonical: `${SITE_URL}/${safeLocale}`,
      languages,
    },
    openGraph: {
      locale: safeLocale,
      alternateLocale: routing.locales.filter((loc) => loc !== safeLocale),
    },
  };
}

async function getThemeStyle(map: Record<string, string> | null): Promise<string> {
  if (!map) return '';
  const COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const LENGTH_RE = /^\d+(\.\d+)?(px|rem|em)$/;
  const FONT_RE = /^['"]?[\w\s,-]+['"]?(?:\s*,\s*[\w\s-]+)*$/;
  const NUMBER_RE = /^\d+(\.\d+)?$/;

  function isValidCssValue(key: string, value: string): boolean {
    const trimmed = value.trim();
    if (key.startsWith('color_')) return COLOR_RE.test(trimmed);
    if (key.startsWith('font_size') || key.startsWith('spacing') || key.startsWith('radius')) return LENGTH_RE.test(trimmed);
    if (key.startsWith('font_family')) return FONT_RE.test(trimmed);
    if (key.startsWith('font_weight') || key.startsWith('line_height')) return NUMBER_RE.test(trimmed);
    return false;
  }

  const vars = Object.entries(map)
    .filter(([k, v]) => isValidCssValue(k, String(v)))
    .map(([k, v]) => {
      const safeKey = k.replace(/[^a-zA-Z0-9_-]/g, '');
      return `--db-${safeKey.replace(/_/g, '-')}: ${String(v).trim()}`;
    })
    .join('; ');
  return vars ? `:root { ${vars} }` : '';
}

async function getSettingsMap(): Promise<Record<string, string> | null> {
  try {
    return await fetchSettingsMap();
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;

  setRequestLocale(safeLocale);

  const [messages, settingsMap] = await Promise.all([
    getMessages(),
    getSettingsMap(),
  ]);

  const themeStyle = await getThemeStyle(settingsMap);
  const mobileBottomNavVisible = settingsMap?.mobile_bottom_nav_visible !== 'false';

  const shellProps = { children, messages, themeStyle, mobileBottomNavVisible };

  if (locale === 'ko') {
    return <KoShell {...shellProps} />;
  }

  return <EnShell {...shellProps} />;
}
