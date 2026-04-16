import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNavWrapper from '@/components/MobileBottomNavWrapper';
import { MobileNavProvider } from '@/contexts/MobileNavContext';
import Providers from '@/components/Providers';
import RecentlyViewedWidget from '@/components/RecentlyViewedWidget';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';

const SITE_URL = process.env.SITE_URL ?? 'https://shop-okhwadang.com';

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

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

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

async function getSettingsMap(locale?: string): Promise<Record<string, string> | null> {
  try {
    const url = locale && locale !== 'ko'
      ? `${BACKEND_URL}/api/settings/map?locale=${locale}`
      : `${BACKEND_URL}/api/settings/map`;
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
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
  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;

  setRequestLocale(safeLocale);

  const [messages, settingsMap, tNav] = await Promise.all([
    getMessages(),
    getSettingsMap(safeLocale),
    getTranslations('navigation'),
  ]);

  const themeStyle = await getThemeStyle(settingsMap);

  const mobileBottomNavVisible = settingsMap?.mobile_bottom_nav_visible !== 'false';

  // SSR 단계에서 data-theme 기본값을 locale 기반으로 설정 — hydration mismatch 방지.
  // 클라이언트의 FOUC 스크립트가 localStorage 에 저장된 사용자 선호가 있으면 즉시 덮어씀.
  const initialTheme = safeLocale === 'ko' ? 'dark' : 'light';

  const foucScript = "(function(){try{var s=localStorage.getItem('theme');if(s==='dark'||s==='light'){document.documentElement.dataset.theme=s;}}catch(e){}})();";

  return (
    <html lang={safeLocale} data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foucScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        {themeStyle ? <style>{themeStyle}</style> : null}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {tNav('skipToContent')}
        </a>
        <NextIntlClientProvider messages={messages}>
          <Providers locale={safeLocale}>
            <MobileNavProvider initialVisible={mobileBottomNavVisible}>
              <div className="flex min-h-screen flex-col">
              <Header />
              <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
              <Footer />
              <MobileBottomNavWrapper visible={mobileBottomNavVisible} />
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    fontFamily: 'var(--font-body)',
                    borderRadius: 'var(--radius-md)',
                  },
                  classNames: {
                    toast: 'bg-card border-border shadow-md',
                    success: 'border-l-4 border-l-[--color-tea]',
                    error: 'border-l-4 border-l-destructive',
                    info: 'border-l-4 border-l-[--color-primary]',
                  },
                }}
              />
              <RecentlyViewedWidget />
            </div>
            </MobileNavProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
