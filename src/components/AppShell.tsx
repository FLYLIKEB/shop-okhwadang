'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { StorefrontBusinessInfo as FooterBusinessInfo } from '@/lib/storefront-shell';
import type { NavigationItem } from '@/lib/api';
import MobileBottomNavWrapper from '@/components/MobileBottomNavWrapper';
import { MobileNavProvider } from '@/contexts/MobileNavContext';
import RecentlyViewedWidget from '@/components/RecentlyViewedWidget';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/components/ui/utils';
import { isCheckoutLightPath } from '@/utils/checkout-theme';

type AppShellProps = {
  children: React.ReactNode;
  locale: Locale;
  mobileBottomNavVisible: boolean;
  announcementBar?: React.ReactNode;
  businessInfo?: FooterBusinessInfo;
  navigationData?: {
    gnb?: NavigationItem[] | null;
    sidebar?: NavigationItem[] | null;
    footer?: NavigationItem[] | null;
  };
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
  mobileBottomNavVisible,
  announcementBar,
  businessInfo,
  navigationData,
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
      <div className={cn('flex min-h-screen flex-col', isCheckoutLightPath(pathname) && 'checkout-light-theme')}>
        {announcementBar}
        <Header initialNavItems={navigationData?.gnb} initialSidebarItems={navigationData?.sidebar} />
        <main id="main-content" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer businessInfo={businessInfo} initialFooterItems={navigationData?.footer} />
        <MobileBottomNavWrapper visible={mobileBottomNavVisible} />
        <SharedToaster />
        <RecentlyViewedWidget />
      </div>
    </MobileNavProvider>
  );
}

