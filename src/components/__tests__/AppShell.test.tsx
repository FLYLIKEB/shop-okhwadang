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

vi.mock('@/components/shared/layout/AnnouncementBar', () => ({
  default: () => <div data-testid="announcement-bar" />,
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
      <AppShell locale="ko" mobileBottomNavVisible>
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
      <AppShell locale="ko" mobileBottomNavVisible>
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
});

