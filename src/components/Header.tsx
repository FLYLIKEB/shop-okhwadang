'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, Search, User, LogOut } from 'lucide-react';
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

export default function Header() {
  const router = useRouter();
  const t = useTranslations('header');
  const tNav = useTranslations('navigation');
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: navItems } = useNavigation('gnb');
  const { items: sidebarItems } = useNavigation('sidebar');
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useUrlModal('menu');
  const [isSearchOpen, setIsSearchOpen] = useUrlModal('search');
  const scrollLogo = useScrollLogoContext();
  const menuPanel = useSlidePanel(isMenuOpen);
  const headerRef = useRef<HTMLElement>(null);
  const { isScrolled } = useHeaderScroll(headerRef);

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
        'sticky top-0 z-50 transition-all duration-300 ease-in-out',
        isScrolled
          ? 'bg-background/85 backdrop-blur-lg border-b border-divider-soft shadow-sm'
          : 'bg-background border-b border-transparent',
      )}>
        {/* 2줄 헤더 — top: 로고/검색/액션 · bottom: GNB 전폭 균등 */}
        <div className="mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-20">
          {/* 햄버거 (mobile) */}
          <button
            type="button"
            onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false); }}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? tNav('closeMenu') : tNav('openMenu')}
            className="p-2 transition-colors shrink-0 text-muted-foreground hover:text-foreground md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <div style={scrollLogo?.headerLogoStyle}>
              <Logo variant="header" />
            </div>
          </Link>

          {/* 데스크탑 검색 (중앙, 넓은 영역) */}
          <form
            onSubmit={handleDesktopSearch}
            role="search"
            aria-label={t('searchLabel')}
            className="hidden md:flex relative items-center flex-1 max-w-lg mx-8"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="w-full border-b border-divider-soft bg-transparent pl-1 pr-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
            />
            <button type="submit" aria-label={t('searchButton')} className="absolute right-3 transition-colors text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* 데스크탑 액션 */}
          <div className="hidden md:flex items-center gap-1">
            <ThemeToggle />
            <LanguageSelector />
            <CartBadge itemCount={itemCount} />
            {isAuthenticated ? (
              <>
                <Link href="/my" aria-label={t('myPage')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <User className="h-5 w-5" />
                </Link>
                <button type="button" onClick={() => void logout()} aria-label={t('logout')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link href="/login" aria-label={t('login')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            )}
          </div>

          {/* 모바일 우측 */}
          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false); }}
              aria-label={isSearchOpen ? t('searchClose') : t('searchOpen')}
              aria-expanded={isSearchOpen}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            {isAuthenticated ? (
              <Link href="/my" aria-label={t('myPage')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login" aria-label={t('login')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            )}
            <div className="p-2">
              <CartBadge itemCount={itemCount} />
            </div>
          </div>
        </div>

        {/* Bottom row — GNB 전폭 균등 분할 */}
        <div className="hidden md:block border-t border-divider-soft">
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
