import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import Providers from '@/components/Providers';
import { isLocale, routing } from '@/i18n/routing';
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
  if (!isLocale(locale)) {
    notFound();
  }
  const safeLocale = locale;

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
        lunchTime: settingsMap.business_lunch_time ?? '',
        holidays: settingsMap.business_holidays ?? '',
        privacyOfficer: settingsMap.business_privacy_officer ?? '',
        infoUrl: settingsMap.business_info_url ?? '',
      }
    : undefined;

  // SSR 단계에서 data-theme 기본값을 light로 설정 — hydration mismatch 방지.
  // ko 로케일은 클라이언트의 FOUC 스크립트가 localStorage 사용자 선호를 즉시 반영한다.
  const initialTheme = 'light';
  const respectsSavedTheme = safeLocale === 'ko';

  const foucScript = `(function(){try{var d='${initialTheme}';var r=${respectsSavedTheme};var s=localStorage.getItem('theme');document.documentElement.dataset.theme=r&&(s==='dark'||s==='light')?s:d;}catch(e){document.documentElement.dataset.theme='${initialTheme}';}})();`;

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
