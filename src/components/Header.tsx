'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, Search, User, LogOut, Shield } from 'lucide-react';
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

export default function Header({ initialNavItems, initialSidebarItems }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('header');
  const tNav = useTranslations('navigation');
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: navItems } = useNavigation('gnb', initialNavItems);
  const { items: sidebarItems } = useNavigation('sidebar', initialSidebarItems);
  const [query, setQuery] = useState('');
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

  const handleDesktopSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push('/search?q=' + encodeURIComponent(trimmed));
  };

  return (
    <>
      <header ref={headerRef} className={cn(
        'toss-header sticky top-0 z-50 transition-all duration-300 ease-in-out',
        isScrolled
          ? 'toss-header--scrolled bg-background/85 backdrop-blur-lg shadow-sm'
          : 'bg-background',
      )}>
        {/* 2줄 헤더 — top: 로고/검색/액션 · bottom: GNB 전폭 균등 */}
        <div className="toss-header__top mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-20">
          {/* 햄버거 (mobile) */}
          <Button
            type="button"
            variant="gray"
            size="icon"
            onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false); }}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? tNav('closeMenu') : tNav('openMenu')}
            className="h-8 min-h-8 w-8 shrink-0 rounded-md md:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <div style={scrollLogo?.headerLogoStyle}>
              <Logo variant="header" alt={t('okhwadang')} />
            </div>
          </Link>

          {/* 데스크탑 검색 (중앙, 넓은 영역) */}
          <form
            onSubmit={handleDesktopSearch}
            role="search"
            aria-label={t('searchLabel')}
            className="toss-header__search hidden md:flex relative items-center flex-1 max-w-lg mx-8"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="toss-header__search-input w-full rounded-md bg-muted/40 pl-3 pr-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-muted/60 transition-colors"
            />
            <Button type="submit" variant="gray" size="icon" aria-label={t('searchButton')} className="toss-header__search-button absolute right-1 h-8 min-h-8 w-8 rounded-md text-muted-foreground hover:text-foreground">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </form>

          {/* 데스크탑 액션 */}
          <div className="toss-header__actions hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <CartBadge itemCount={itemCount} />
            {isAuthenticated ? (
              <>
                <Link href="/my" aria-label={t('myPage')} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <User className="h-4 w-4" />
                </Link>
                <Button type="button" variant="gray" size="icon" onClick={() => void logout()} aria-label={t('logout')} className="h-8 min-h-8 w-8 rounded-md text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Link href="/admin" aria-label={t('adminPage')} className="ml-2 inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 typo-button text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                    <Shield className="h-4 w-4" />
                    {t('adminPage')}
                  </Link>
                )}
              </>
            ) : (
              <Link href="/login" aria-label={t('login')} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* 모바일 우측 */}
          <div className="toss-header__mobile-actions md:hidden flex items-center gap-2">
            <Button
              type="button"
              variant="gray"
              size="icon"
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false); }}
              aria-label={isSearchOpen ? t('searchClose') : t('searchOpen')}
              aria-expanded={isSearchOpen}
              className="h-8 min-h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            >
              {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <Link href="/my" aria-label={t('myPage')} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/login" aria-label={t('login')} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
              </Link>
            )}
            <div className="p-1.5">
              <CartBadge itemCount={itemCount} />
            </div>
          </div>
        </div>

        {/* Bottom row — GNB 전폭 균등 분할 */}
        <div className="toss-header__gnb hidden md:block">
          <div className="flex h-12 items-stretch justify-between px-4 md:px-20">
            <DesktopNav items={navItems} fullWidth />
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
