import type { Metadata } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import Providers from '@/components/Providers';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { getThemeStyle } from '@/lib/theme-style';

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

const GOOGLE_TAG_ID = 'G-ENSHH2TBSY';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

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

  const mobileBottomNavVisible = settingsMap?.mobile_bottom_nav_visible === 'true';

  const businessInfo = settingsMap
    ? {
        companyName: settingsMap.business_company_name ?? '',
        ceo: settingsMap.business_ceo ?? '',
        address: settingsMap.business_address ?? '',
        bizNo: settingsMap.business_registration_number ?? '',
        mailOrderNo: settingsMap.business_mail_order_number ?? '',
        phone: settingsMap.business_phone ?? '',
        email: settingsMap.business_email ?? '',
        hours: settingsMap.business_hours ?? '',
        privacyOfficer: settingsMap.business_privacy_officer ?? '',
        infoUrl: settingsMap.business_info_url ?? '',
      }
    : undefined;

  // SSR 단계에서 data-theme 기본값을 locale 기반으로 설정 — hydration mismatch 방지.
  // 클라이언트의 FOUC 스크립트가 localStorage 에 저장된 사용자 선호가 있으면 즉시 덮어씀.
  const initialTheme = safeLocale === 'ko' ? 'dark' : 'light';

  const foucScript = `(function(){try{var d='${initialTheme}';var s=localStorage.getItem('theme');document.documentElement.dataset.theme=d==='light'?'light':(s==='dark'||s==='light'?s:d);}catch(e){document.documentElement.dataset.theme='${initialTheme}';}})();`;

  return (
    <html lang={safeLocale} data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foucScript }} />
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
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
            <AppShell
              locale={safeLocale}
              mobileBottomNavVisible={mobileBottomNavVisible}
              announcementBar={<AnnouncementBar locale={safeLocale} />}
              businessInfo={businessInfo}
            >
              {children}
            </AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
