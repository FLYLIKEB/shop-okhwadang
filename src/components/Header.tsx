'use client'

import { useState, useEffect } from 'react';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { ShoppingCart, Menu, X, ArrowLeft, Home, Search } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationItem } from '@/lib/api';

// ─── Sub-components ──────────────────────────────────────────────

interface SearchFormProps {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

function SearchForm({ query, setQuery, onSubmit, className }: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} role="search" aria-label="상품 검색" className={cn('relative flex items-center', className)}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="상품 검색..."
        aria-label="상품 검색"
        className={cn(
          'w-full rounded-md border border-input bg-background pl-3 pr-10 py-1.5 text-sm',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
        )}
      />
      <button
        type="submit"
        aria-label="검색"
        className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

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
}

function DesktopActions({ isAuthenticated, userName, itemCount, onLogout }: DesktopActionsProps) {
  return (
    <div className="hidden md:flex items-center gap-4">
      <CartBadge itemCount={itemCount} />
      {isAuthenticated ? (
        <>
          <Link href="/my" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {userName ?? '마이페이지'}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            로그아웃
          </button>
        </>
      ) : (
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
      className="absolute w-full bg-white border-b shadow-sm"
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
      </div>
    </nav>
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
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isSubPage = pathname !== '/';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push('/search?q=' + encodeURIComponent(trimmed));
  };

  return (
    <header className={cn(
      'sticky top-0 z-50 bg-white/95 transition-[border-color,box-shadow,backdrop-filter] duration-300 ease-in-out',
      isScrolled
        ? 'border-b border-border backdrop-blur-[8px] shadow-sm'
        : 'border-b border-transparent backdrop-blur-none',
    )}>
      {/* Top row */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Mobile: hamburger always leftmost */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile: back button on sub-pages (after hamburger) */}
        {isSubPage && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {/* Logo — hidden on mobile sub-pages */}
        <Link href="/" className={cn('text-xl font-bold text-foreground shrink-0', isSubPage && 'hidden md:block')}>
          옥화당
        </Link>

        {/* Desktop nav */}
        <nav aria-label="메인 메뉴" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.url}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search */}
        <SearchForm
          query={query}
          setQuery={setQuery}
          onSubmit={handleSearch}
          className="hidden md:flex items-center flex-1 max-w-sm"
        />

        {/* Desktop actions */}
        <DesktopActions
          isAuthenticated={isAuthenticated}
          userName={user?.name}
          itemCount={itemCount}
          onLogout={() => void logout()}
        />

        {/* Mobile right actions: Home + Cart */}
        <div className="md:hidden flex items-center gap-1 ml-auto">
          {isSubPage && (
            <Link href="/" aria-label="홈" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-5 w-5" />
            </Link>
          )}
          <div className="p-2">
            <CartBadge itemCount={itemCount} />
          </div>
        </div>
      </div>

      {/* Mobile search bar — always visible */}
      <div className="md:hidden border-t px-4 py-2">
        <SearchForm
          query={query}
          setQuery={setQuery}
          onSubmit={handleSearch}
          className="flex items-center"
        />
      </div>

      {/* Mobile menu */}
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
  );
}
