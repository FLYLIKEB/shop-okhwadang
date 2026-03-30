import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import Providers from '@/components/Providers';
import RecentlyViewedWidget from '@/components/RecentlyViewedWidget';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: '옥화당',
    template: '%s | 옥화당',
  },
  description: '자사호·보이차·다구 전문 쇼핑몰',
  metadataBase: new URL(process.env.SITE_URL ?? 'https://shop-okhwadang.com'),
  openGraph: {
    siteName: '옥화당',
    locale: 'ko_KR',
    type: 'website',
  },
};

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function getThemeStyle(): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings/map`, {
      cache: 'no-store',
    });
    if (!res.ok) return '';
    const map: Record<string, string> = await res.json();
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
  } catch {
    return '';
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeStyle = await getThemeStyle();

  return (
    <html lang="ko">
      <head>{themeStyle ? <style>{themeStyle}</style> : null}</head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          본문으로 바로가기
        </a>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
            <Toaster position="top-right" richColors />
            <RecentlyViewedWidget />
          </div>
        </Providers>
      </body>
    </html>
  );
}
