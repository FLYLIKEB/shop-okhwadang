import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppShell from '@/components/AppShell';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/components/Header', () => ({
  default: () => <header data-testid="global-header">Global Header</header>,
}));

vi.mock('@/components/Footer', () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/MobileBottomNavWrapper', () => ({
  default: () => <nav data-testid="mobile-bottom-nav" />,
}));

vi.mock('@/components/RecentlyViewedWidget', () => ({
  default: () => <aside data-testid="recently-viewed" />,
}));

vi.mock('@/contexts/MobileNavContext', () => ({
  MobileNavProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mobile-nav-provider">{children}</div>
  ),
}));

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe('AppShell', () => {
  it('renders public chrome on storefront routes', () => {
    mockPathname = '/ko/products';

    render(
      <AppShell
        locale="ko"
        mobileBottomNavVisible
        announcementBar={<div data-testid="announcement-bar" />}
      >
        storefront content
      </AppShell>,
    );

    expect(screen.getByTestId('global-header')).toBeInTheDocument();
    expect(screen.getByTestId('announcement-bar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByText('storefront content')).toBeInTheDocument();
  });

  it('hides public chrome on admin routes', () => {
    mockPathname = '/ko/admin/dashboard';

    render(
      <AppShell
        locale="ko"
        mobileBottomNavVisible
        announcementBar={<div data-testid="announcement-bar" />}
      >
        admin content
      </AppShell>,
    );

    expect(screen.queryByTestId('global-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('announcement-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recently-viewed')).not.toBeInTheDocument();
    expect(screen.getByText('admin content')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('inherits the selected theme for payment confirmation routes', () => {
    mockPathname = '/ko/checkout';

    const { container } = render(
      <AppShell
        locale="ko"
        mobileBottomNavVisible
        announcementBar={<div data-testid="announcement-bar" />}
      >
        checkout content
      </AppShell>,
    );

    expect(container.querySelector('main')).not.toHaveClass('checkout-light-theme');
    expect(screen.getByTestId('global-header')).toBeInTheDocument();
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
  });

  it('inherits the selected theme for the cart route', () => {
    mockPathname = '/ko/cart';

    const { container } = render(
      <AppShell
        locale="ko"
        mobileBottomNavVisible
        announcementBar={<div data-testid="announcement-bar" />}
      >
        cart content
      </AppShell>,
    );

    expect(container.querySelector('main')).not.toHaveClass('checkout-light-theme');
    expect(screen.getByTestId('global-header').parentElement).toHaveClass('cart-route-header');
    expect(screen.getByTestId('footer').parentElement).toHaveClass('cart-route-footer');
  });

  it('inherits the selected theme for product detail routes', () => {
    mockPathname = '/ko/products/1';

    const { container } = render(
      <AppShell locale="ko" mobileBottomNavVisible>
        product detail content
      </AppShell>,
    );

    expect(container.querySelector('main')).not.toHaveClass('product-detail-light-theme');
    expect(screen.getByTestId('global-header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it.each(['/ko', '/en'].flatMap((locale) =>
    ['/cart', '/checkout', '/order/complete', '/products/1'].map((path) => `${locale}${path}`),
  ))('does not override the active dark theme on %s', (pathname) => {
    mockPathname = pathname;
    document.documentElement.dataset.theme = 'dark';

    try {
      const { container } = render(
        <AppShell locale={pathname.startsWith('/en') ? 'en' : 'ko'} mobileBottomNavVisible>
          content
        </AppShell>,
      );

      expect(container.querySelector('main')).not.toHaveClass('checkout-light-theme', 'product-detail-light-theme');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('does not import server-only announcement fetching into the client shell', () => {
    const source = readFileSync('src/components/AppShell.tsx', 'utf8');

    expect(source).not.toContain('@/components/shared/layout/AnnouncementBar');
    expect(source).not.toContain('@/lib/api-server');
  });
});
