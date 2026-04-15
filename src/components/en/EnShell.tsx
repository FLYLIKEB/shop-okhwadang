import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { Toaster } from 'sonner';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import Header from '@/components/en/Header';
import Footer from '@/components/en/Footer';
import MobileBottomNavWrapper from '@/components/shared/MobileBottomNavWrapper';
import { MobileNavProvider } from '@/contexts/MobileNavContext';
import Providers from '@/components/shared/Providers';
import PageTransition from '@/components/shared/PageTransition';
import RecentlyViewedWidget from '@/components/shared/RecentlyViewedWidget';

export interface EnShellProps {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  themeStyle: string;
  mobileBottomNavVisible: boolean;
}

export default function EnShell({
  children,
  messages,
  themeStyle,
  mobileBottomNavVisible,
}: EnShellProps) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        {themeStyle ? <style>{themeStyle}</style> : null}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MobileNavProvider initialVisible={mobileBottomNavVisible}>
              <PageTransition />
              <div className="flex min-h-screen flex-col">
                <AnnouncementBar />
                <Header />
                <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
                <Footer />
                <MobileBottomNavWrapper />
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
