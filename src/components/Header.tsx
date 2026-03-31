'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X, Search } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useLogoScroll } from '@/components/contexts/LogoScrollContext';
import type { NavigationItem } from '@/lib/api';
import LanguageSelector from '@/components/LanguageSelector';

// ─── Sub-components ──────────────────────────────────────────────

interface CartBadgeProps {
  itemCount: number;
  className?: string;
  iconSize?: string;
}

function CartBadge({ itemCount, className, iconSize = 'h-5 w-5' }: CartBadgeProps) {
  return (
    <Link href="/cart" aria-label="장바구니" className={cn('relative', className)}>
      <ShoppingCart className={cn(iconSize, 'text-muted-foreground hover:text-foreground transition-colors')} />
      {itemCount > 0 && (
        <span
          role="status"
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold leading-none"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}

interface DesktopActionsProps {
  isAuthenticated: boolean;
  userName?: string;
  itemCount: number;
  onLogout: () => void;
  isHomePage?: boolean;
}

function DesktopActions({ isAuthenticated, userName, itemCount, onLogout, isHomePage }: DesktopActionsProps) {
  const textClass = isHomePage ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground";
  return (
    <div className="hidden md:flex items-center gap-4">
      <LanguageSelector />
      <CartBadge itemCount={itemCount} />
      {isAuthenticated ? (
        <>
          <Link href="/my" className={cn("text-sm transition-colors", textClass)}>
            {userName ?? '마이페이지'}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className={cn("text-sm transition-colors", textClass)}
          >
            로그아웃
          </button>
        </>
      ) : (
        <Link href="/login" className={cn("text-sm transition-colors", textClass)}>
          로그인
        </Link>
      )}
    </div>
  );
}

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string;
  navItems: NavigationItem[];
  sidebarItems: NavigationItem[];
  onClose: () => void;
  onLogout: () => void;
}

function MobileMenu({ isAuthenticated, userName, navItems, sidebarItems, onClose, onLogout }: MobileMenuProps) {
  const menuItems = sidebarItems.length > 0 ? sidebarItems : navItems;
  return (
    <nav
      id="mobile-menu"
      aria-label="모바일 메뉴"
      className="absolute w-full bg-background border-b shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            <Link
              href={item.url}
              onClick={onClose}
              className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors block"
            >
              {item.label}
            </Link>
            {item.children.length > 0 && (
              <div className="pl-4">
                {item.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.url}
                    onClick={onClose}
                    className="py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors block"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        <Link
          href="/cart"
          onClick={onClose}
          className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          장바구니
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              href="/my"
              onClick={onClose}
              className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {userName ?? '마이페이지'}
            </Link>
            <button
              type="button"
              onClick={() => { onClose(); onLogout(); }}
              className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              로그아웃
            </button>
          </>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            로그인
          </Link>
        )}
        <div className="py-2">
          <LanguageSelector />
        </div>
      </div>
    </nav>
  );
}

// ─── Mobile Search Overlay ────────────────────────────────────────

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push('/search?q=' + encodeURIComponent(trimmed));
    onClose();
  };

  return (
    <>
      {/* 배경 딤 */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-[45] bg-black/20 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 검색 패널 — 헤더 바로 아래 페이드인 */}
      <div
        className={cn(
          'md:hidden fixed left-0 right-0 z-[46] bg-background/95 backdrop-blur-md shadow-md transition-[opacity,transform] duration-200 ease-in-out',
          isOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2',
        )}
        style={{ top: '56px' }}
        role="search"
        aria-label="모바일 검색"
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색..."
            aria-label="상품 검색"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 닫기"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: navItems } = useNavigation('gnb');
  const { items: sidebarItems } = useNavigation('sidebar');
  const { progress } = useLogoScroll();
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isHomePage = pathname === '/' || /^\/(ko|en)\/?$/.test(pathname);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMenuOpen(false); setIsSearchOpen(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isMenuOpen);
    return () => { document.body.classList.remove('overflow-hidden'); };
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDesktopSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push('/search?q=' + encodeURIComponent(trimmed));
  };

  const showHeaderLogo = true;
  const isOverHero = isHomePage && progress === 0;

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ease-in-out',
        isOverHero
          ? 'bg-transparent border-b border-transparent'
          : isScrolled
            ? 'bg-white/95 backdrop-blur-[8px] border-b border-border shadow-sm'
            : 'bg-white/95 backdrop-blur-[8px] border-b border-transparent',
      )}>
        {/* Top row */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">

          {/* 햄버거 */}
          <button
            type="button"
            onClick={() => { setIsMenuOpen((p) => !p); setIsSearchOpen(false); }}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            className={cn("p-2 -ml-2 transition-colors shrink-0", isHomePage ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground")}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* 로고 */}
          <Link
            href="/"
            className={cn(
              'shrink-0 transition-[opacity,transform,color] duration-300 ease-in-out',

              (showHeaderLogo || isHomePage)
                ? 'opacity-100 pointer-events-auto translate-x-0'
                : 'opacity-0 pointer-events-none -translate-x-2',
            )}
            aria-hidden={!showHeaderLogo && !isHomePage}
            tabIndex={!showHeaderLogo && !isHomePage ? -1 : undefined}
          >
            <Logo variant={isHomePage ? 'hero' : 'header'} />
          </Link>

          {/* 데스크탑 네비 */}
          <nav aria-label="메인 메뉴" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className={cn("text-sm transition-colors", isHomePage ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 데스크탑 검색 */}
          <form
            onSubmit={handleDesktopSearch}
            role="search"
            aria-label="상품 검색"
            className="hidden md:flex relative items-center flex-1 max-w-sm"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="상품 검색..."
              aria-label="상품 검색"
              className="w-full rounded-md border border-input bg-background pl-3 pr-10 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" aria-label="검색" className={cn("absolute right-2 transition-colors", isHomePage ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* 데스크탑 액션 */}
          <DesktopActions
            isAuthenticated={isAuthenticated}
            userName={user?.name}
            itemCount={itemCount}
            onLogout={() => void logout()}
            isHomePage={isHomePage}
          />

          {/* 모바일 우측: 검색 + 홈 + 카트 */}
          <div className={cn("md:hidden flex items-center gap-1 ml-auto", isHomePage && "[&_svg]:text-white/80 [&_a]:text-white/80")}>
            <button
              type="button"
              onClick={() => { setIsSearchOpen((p) => !p); setIsMenuOpen(false); }}
              aria-label={isSearchOpen ? '검색 닫기' : '검색 열기'}
              aria-expanded={isSearchOpen}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <div className="p-2">
              <CartBadge itemCount={itemCount} />
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <MobileMenu
            isAuthenticated={isAuthenticated}
            userName={user?.name}
            navItems={navItems}
            sidebarItems={sidebarItems}
            onClose={() => setIsMenuOpen(false)}
            onLogout={() => void logout()}
          />
        )}
      </header>

      {/* 모바일 검색 오버레이 (헤더 바깥 — sticky 헤더 아래에 fixed로 위치) */}
      <MobileSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
