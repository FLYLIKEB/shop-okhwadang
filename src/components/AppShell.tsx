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
import { isCheckoutLightPath, isProductDetailPath } from '@/utils/checkout-theme';

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
      className="toss-toaster"
      expand={false}
      visibleToasts={3}
      gap={8}
      offset={{ top: 72 }}
      mobileOffset={{ top: 16, left: 16, right: 16 }}
      swipeDirections={['top', 'right', 'bottom', 'left']}
      toastOptions={{
        unstyled: true,
        style: {
          fontFamily: 'var(--font-body)',
          borderRadius: '1rem',
          background: 'var(--checkout-toss-surface)',
          color: 'var(--checkout-toss-foreground)',
          border: '1px solid var(--checkout-toss-border)',
          boxShadow: 'var(--checkout-toss-shadow)',
        },
        classNames: {
          toast: 'toss-toast',
          icon: 'toss-toast__icon',
          title: 'toss-toast__title',
          description: 'toss-toast__description',
          closeButton: 'toss-toast__close',
          actionButton: 'toss-toast__action',
          success: 'toss-toast--success',
          error: 'toss-toast--error',
          warning: 'toss-toast--warning',
          info: 'toss-toast--info',
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
      <div className="flex min-h-screen flex-col">
        {announcementBar}
        <Header initialNavItems={navigationData?.gnb} initialSidebarItems={navigationData?.sidebar} />
        <main
          id="main-content"
          className={cn(
            'flex-1 pb-16 md:pb-0',
            isCheckoutLightPath(pathname) && 'checkout-light-theme',
            isProductDetailPath(pathname) && 'product-detail-light-theme',
          )}
        >
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

