'use client';

import { useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useSlidePanel } from '@/hooks/useSlidePanel';
import { useUrlModal } from '@/hooks/useUrlModal';
import { useHeaderScroll } from '@/hooks/useHeaderScroll';
import { useScrollLogoContext } from '@/contexts/ScrollLogoContext';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { CartBadge } from '@/components/header/CartBadge';
import { MobileMenu } from '@/components/header/MobileMenu';
import { MobileSearchOverlay } from '@/components/header/MobileSearchOverlay';
import { DesktopNav } from '@/components/header/DesktopNav';
import type { NavigationItem } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  initialNavItems?: NavigationItem[] | null;
  initialSidebarItems?: NavigationItem[] | null;
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M3 8h18M3 16h18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Header({ initialNavItems, initialSidebarItems }: HeaderProps) {
  const t = useTranslations('header');
  const tNav = useTranslations('navigation');
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: navItems } = useNavigation('gnb', initialNavItems);
  const { items: sidebarItems } = useNavigation('sidebar', initialSidebarItems);
  const [isMenuOpen, setIsMenuOpen] = useUrlModal('menu');
  const [isSearchOpen, setIsSearchOpen] = useUrlModal('search');
  const scrollLogo = useScrollLogoContext();
  const menuPanel = useSlidePanel(isMenuOpen);
  const headerRef = useRef<HTMLElement>(null);
  const { isScrolled } = useHeaderScroll(headerRef);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Global Escape: close menu + search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMenuOpen(false); setIsSearchOpen(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsMenuOpen, setIsSearchOpen]);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isMenuOpen);
    return () => { document.body.classList.remove('overflow-hidden'); };
  }, [isMenuOpen]);

  const searchButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false); }}
      aria-label={isSearchOpen ? t('searchClose') : t('searchOpen')}
      aria-expanded={isSearchOpen}
      className="px-2 font-normal text-foreground"
    >
      {t('searchText')}
    </Button>
  );

  const accountLink = (
    <Link
      href={isAuthenticated ? '/my' : '/login'}
      aria-label={isAuthenticated ? t('myPage') : t('login')}
      className="inline-flex h-11 items-center justify-center px-2 typo-body-sm font-normal text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {t(isAuthenticated ? 'myPageText' : 'loginText')}
    </Link>
  );

  return (
    <>
      <header ref={headerRef} className={cn(
        'toss-header sticky top-0 z-50 transition-all duration-300 ease-in-out',
        isScrolled
          ? 'toss-header--scrolled backdrop-blur-lg'
          : 'bg-background',
      )}>
        <div className="toss-header__top relative mx-auto flex min-h-11 items-center justify-between gap-2 px-2 lg:gap-4 lg:px-8">
          {/* 햄버거 (mobile) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false); }}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? tNav('closeMenu') : tNav('openMenu')}
            className="h-11 min-h-11 w-11 shrink-0 bg-transparent p-0 text-foreground lg:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <HamburgerIcon />}
          </Button>

          {/* 로고 */}
          <Link href="/" className="absolute left-1/2 flex h-11 shrink-0 -translate-x-1/2 items-center overflow-hidden lg:static lg:translate-x-0">
            <div style={scrollLogo?.headerLogoStyle}>
              <Logo variant="header" alt={t('okhwadang')} className="w-20 lg:w-24" />
            </div>
          </Link>

          <div className="toss-header__gnb hidden min-w-0 flex-1 lg:block">
            <DesktopNav items={navItems} />
          </div>

          {/* 데스크탑 액션 */}
          <div className="toss-header__actions hidden lg:flex items-center gap-0">
            {searchButton}
            <ThemeToggle />
            <LanguageSelector />
            <CartBadge itemCount={itemCount} />
            {accountLink}
            {isAuthenticated && (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => void logout()} aria-label={t('logout')} className="px-2 font-normal text-foreground">
                  {t('logoutText')}
                </Button>
                {isAdmin && (
                  <Link href="/admin" aria-label={t('adminPage')} className="ml-2 inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 typo-button text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                    {t('adminPage')}
                  </Link>
                )}
              </>
            )}
          </div>

          {/* 모바일 우측 */}
          <div className="toss-header__mobile-actions lg:hidden flex items-center gap-0">
            {searchButton}
            <div className="hidden sm:flex">{accountLink}</div>
            <CartBadge itemCount={itemCount} />
          </div>
        </div>

      </header>

      {/* 모바일 메뉴 오버레이 */}
      {menuPanel.mounted && (
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userName={user?.name}
          userRole={user?.role}
          navItems={navItems}
          sidebarItems={sidebarItems}
          visible={menuPanel.visible}
          onClose={() => setIsMenuOpen(false)}
          onNavigate={() => setIsMenuOpen(false, 'replace')}
          onLogout={() => void logout()}
        />
      )}

      {/* 모바일 검색 오버레이 (헤더 바깥 — sticky 헤더 아래에 fixed로 위치) */}
      <MobileSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
