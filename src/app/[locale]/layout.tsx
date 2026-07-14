import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import Providers from '@/components/Providers';
import { isLocale, routing } from '@/i18n/routing';
import { fetchNavigationGroup, fetchSettingsMap } from '@/lib/api-server';
import { buildStorefrontShellSnapshot } from '@/lib/storefront-shell';


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
  if (!isLocale(locale)) {
    notFound();
  }
  const safeLocale = locale;

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

const GOOGLE_TAG_ID = 'G-ENSHH2TBSY';

async function getStorefrontShellSnapshot(locale: string) {
  try {
    const settingsMap = await fetchSettingsMap(locale);
    return buildStorefrontShellSnapshot(settingsMap);
  } catch {
    return buildStorefrontShellSnapshot(null, { fetchFailed: true });
  }
}

async function getPrefetchedNavigation(locale: string) {
  const [gnb, sidebar, footer] = await Promise.allSettled([
    fetchNavigationGroup('gnb', locale),
    fetchNavigationGroup('sidebar', locale),
    fetchNavigationGroup('footer', locale),
  ]);

  return {
    gnb: gnb.status === 'fulfilled' ? gnb.value : null,
    sidebar: sidebar.status === 'fulfilled' ? sidebar.value : null,
    footer: footer.status === 'fulfilled' ? footer.value : null,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const safeLocale = locale;

  setRequestLocale(safeLocale);

  const [messages, shellSnapshot, navigationData, tNav, tUi] = await Promise.all([
    getMessages(),
    getStorefrontShellSnapshot(safeLocale),
    getPrefetchedNavigation(safeLocale),
    getTranslations('navigation'),
    getTranslations('ui'),
  ]);


  const degradedNotice = shellSnapshot.mode === 'degraded'
    ? (
      <div data-testid="storefront-shell-degraded-notice" className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="layout-container py-3">
          <p className="text-sm font-medium">{tUi('storefrontShellDegradedTitle')}</p>
          <p className="mt-1 text-xs md:text-sm">
            {shellSnapshot.issue === 'missing_required_settings'
              ? tUi('storefrontShellMissingRequiredSettings', { keys: shellSnapshot.missingRequiredKeys.join(', ') })
              : tUi('storefrontShellFetchFailedDescription')}
          </p>
          <p className="mt-1 text-xs text-amber-800">{tUi('storefrontShellRecoveryHint')}</p>
        </div>
      </div>
    )
    : null;

  // SSR 단계에서 data-theme 기본값을 light로 설정 — hydration mismatch 방지.
  // ko 로케일은 클라이언트의 FOUC 스크립트가 localStorage 사용자 선호를 즉시 반영한다.
  const initialTheme = 'light';
  const respectsSavedTheme = safeLocale === 'ko';

  const foucScript = `(function(){try{var d='${initialTheme}';var r=${respectsSavedTheme};var s=localStorage.getItem('theme');document.documentElement.dataset.theme=r&&(s==='dark'||s==='light')?s:d;}catch(e){document.documentElement.dataset.theme='${initialTheme}';}})();`;

  return (
    <html lang={safeLocale} data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foucScript }} />
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
        {shellSnapshot.themeStyle ? <style>{shellSnapshot.themeStyle}</style> : null}
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
            <AppShell
              locale={safeLocale}
              mobileBottomNavVisible={shellSnapshot.mobileBottomNavVisible}
              announcementBar={
                <>
                  {degradedNotice}
                  <AnnouncementBar locale={safeLocale} />
                </>
              }
              businessInfo={shellSnapshot.businessInfo}
              navigationData={navigationData}
            >
              {children}
            </AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
