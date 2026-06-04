'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import AnnouncementBar from '@/components/shared/layout/AnnouncementBar';
import Footer from '@/components/Footer';
import MobileBottomNavWrapper from '@/components/MobileBottomNavWrapper';
import { MobileNavProvider } from '@/contexts/MobileNavContext';
import RecentlyViewedWidget from '@/components/RecentlyViewedWidget';
import type { Locale } from '@/i18n/routing';

type AppShellProps = {
  children: React.ReactNode;
  locale: Locale;
  mobileBottomNavVisible: boolean;
};

function isAdminPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?admin(?:\/|$)/.test(pathname);
}

function SharedToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      swipeDirections={['top', 'right', 'bottom', 'left']}
      toastOptions={{
        style: {
          fontFamily: 'var(--font-body)',
          borderRadius: 'var(--radius-md)',
        },
      }}
    />
  );
}

export default function AppShell({
  children,
  locale,
  mobileBottomNavVisible,
}: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute = isAdminPath(pathname);

  if (isAdminRoute) {
    return (
      <>
        <main id="main-content">{children}</main>
        <SharedToaster />
      </>
    );
  }

  return (
    <MobileNavProvider initialVisible={mobileBottomNavVisible}>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar locale={locale} />
        <Header />
        <main id="main-content" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileBottomNavWrapper visible={mobileBottomNavVisible} />
        <SharedToaster />
        <RecentlyViewedWidget />
      </div>
    </MobileNavProvider>
  );
}

