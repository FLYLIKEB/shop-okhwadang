import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileMenu } from './MobileMenu';
import type { NavigationItem } from '@/lib/api';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; [key: string]: unknown }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/ui-messages')).uiMessages as unknown as Record<string, Record<string, string>>;
  return {
    ...actual,
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => (key: string) => {
      const ns = messages[namespace] ?? {};
      return ns[key] ?? key;
    },
  };
});

vi.mock('@/contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/ThemeContext')>();
  return {
    ...actual,
    useTheme: () => ({
      theme: 'dark',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    }),
  };
});

function navItem(overrides: Partial<NavigationItem>): NavigationItem {
  return {
    id: 1,
    group: 'sidebar',
    label: '상품',
    labelEn: null,
    url: '/products',
    sort_order: 0,
    is_active: true,
    parent_id: null,
    children: [],
    ...overrides,
  };
}

const sidebarItems: NavigationItem[] = [
  navItem({
    id: 1,
    label: '자사호',
    url: '/products?category=zisha',
    children: [
      navItem({ id: 11, label: '주니', url: '/products?category=zhuni', parent_id: 1 }),
      navItem({ id: 12, label: '자사', url: '/products?category=zisha-clay', parent_id: 1 }),
    ],
  }),
  navItem({ id: 2, label: '보이차', url: '/products?category=puer' }),
];

function renderMobileMenu() {
  return render(
    <MobileMenu
      isAuthenticated={false}
      navItems={[]}
      sidebarItems={sidebarItems}
      visible
      onClose={vi.fn()}
      onNavigate={vi.fn()}
      onLogout={vi.fn()}
    />,
  );
}

describe('MobileMenu', () => {
  it('slides from the main panel to a submenu panel and back', async () => {
    const user = userEvent.setup();
    renderMobileMenu();

    const mobileNav = screen.getByRole('navigation', { name: "Mobile Menu" });
    const track = within(mobileNav).getByTestId('mobile-menu-track');

    expect(track).toHaveStyle({ transform: 'translateX(-0%)' });
    expect(within(mobileNav).getByRole('button', { name: 'Open 자사호 submenu' })).toBeInTheDocument();

    await user.click(within(mobileNav).getByRole('button', { name: 'Open 자사호 submenu' }));

    expect(track).toHaveStyle({ transform: 'translateX(-100%)' });
    expect(within(mobileNav).getByRole('button', { name: 'Back to 자사호 menu' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: '주니' })).toHaveAttribute('href', '/products?category=zhuni');

    await user.click(within(mobileNav).getByRole('button', { name: 'Back to 자사호 menu' }));

    expect(track).toHaveStyle({ transform: 'translateX(-0%)' });
    expect(within(mobileNav).getByRole('button', { name: 'Open 자사호 submenu' })).toBeInTheDocument();
  });
});
