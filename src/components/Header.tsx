'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X, Search, User, LogOut, LogIn, UserPlus, MessageSquare, Package } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useSlidePanel } from '@/hooks/useSlidePanel';
import { useScrollLogoContext } from '@/contexts/ScrollLogoContext';
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
}

function DesktopActions({ isAuthenticated, itemCount, onLogout }: DesktopActionsProps) {
  const textClass = "text-muted-foreground hover:text-foreground";
  return (
    <div className="hidden md:flex items-center gap-4">
      <LanguageSelector />
      <CartBadge itemCount={itemCount} />
      {isAuthenticated ? (
        <>
          <Link href="/my" aria-label="마이페이지" className={cn("transition-colors", textClass)}>
            <User className="h-5 w-5" />
          </Link>
          <button type="button" onClick={onLogout} aria-label="로그아웃" className={cn("transition-colors", textClass)}>
            <LogOut className="h-5 w-5" />
          </button>
        </>
      ) : (
        <Link href="/login" aria-label="로그인" className={cn("transition-colors", textClass)}>
          <User className="h-5 w-5" />
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
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

interface HistoryEntry {
  title: string;
  items: NavigationItem[];
}

function MobileMenu({ isAuthenticated, userName, navItems, sidebarItems, visible, onClose, onLogout }: MobileMenuProps) {
  const menuItems = sidebarItems.length > 0 ? sidebarItems : navItems;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const current = history.length > 0 ? history[history.length - 1] : { title: '메뉴', items: menuItems };

  const handleItemClick = (item: NavigationItem) => {
    if (item.children.length > 0) {
      setHistory(h => [...h, { title: item.label, items: item.children }]);
    } else {
      closeAndReset();
    }
  };

  const handleBack = () => {
    setHistory(h => h.slice(0, -1));
  };

  const closeAndReset = () => {
    setHistory([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={closeAndReset}
        aria-hidden="true"
      />
      <nav
        aria-label="모바일 메뉴"
        className={cn(
          'absolute left-0 top-0 h-full w-80 bg-background shadow-xl transition-transform duration-500 ease-out',
          visible ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative w-full h-full overflow-y-auto overflow-x-hidden">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center px-4 h-14 border-b border-border shrink-0">
              <button
                type="button"
                onClick={history.length > 0 ? handleBack : onClose}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={history.length > 0 ? '뒤로' : '메뉴 닫기'}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5l-5 5 5 5" />
                </svg>
              </button>
              <span className={cn('typo-body-sm font-medium', history.length > 0 ? 'ml-3' : 'ml-0')}>
                {current.title}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-1">
                {current.items.map((item) => (
                  <div key={item.id}>
                    {item.children && item.children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className="w-full min-h-11 py-3 text-left typo-body-sm text-foreground hover:text-muted-foreground transition-colors flex items-center justify-between"
                      >
                        {item.label}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                          <path d="M6 4l4 4-4 4" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={item.url}
                        onClick={closeAndReset}
                        className="block min-h-11 py-3 typo-body-sm text-foreground hover:text-muted-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-4 border-t border-border shrink-0">
              <div className="flex flex-col gap-1">
                {isAuthenticated ? (
                  <>
                    <Link href="/my" onClick={closeAndReset} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
                      <User className="h-4 w-4" />
                      {userName ?? '마이페이지'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { closeAndReset(); onLogout(); }}
                      className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-3"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={closeAndReset} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
                      <LogIn className="h-4 w-4" />
                      로그인
                    </Link>
                    <Link href="/signup" onClick={closeAndReset} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
                      <UserPlus className="h-4 w-4" />
                      계정 만들기
                    </Link>
                  </>
                )}
                <Link href="/contact" onClick={closeAndReset} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
                  <MessageSquare className="h-4 w-4" />
                  문의하기
                </Link>
                <Link href="/order-tracking" onClick={closeAndReset} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
                  <Package className="h-4 w-4" />
                  주문조회
                </Link>
              </div>
              <div className="mt-4">
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
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
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: navItems } = useNavigation('gnb');
  const { items: sidebarItems } = useNavigation('sidebar');
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollLogo = useScrollLogoContext();
  const menuPanel = useSlidePanel(isMenuOpen);

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

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300 ease-in-out bg-background',
        isScrolled
          ? 'border-b border-border shadow-sm'
          : 'border-b border-transparent',
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
            className="p-2 -ml-2 transition-colors shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <div style={scrollLogo?.headerLogoStyle}>
              <Logo variant="header" />
            </div>
          </Link>

          {/* 데스크탑 네비 */}
          <nav aria-label="메인 메뉴" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="text-sm transition-colors text-muted-foreground hover:text-foreground"
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
            <button type="submit" aria-label="검색" className="absolute right-2 transition-colors text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* 데스크탑 액션 */}
          <DesktopActions
            isAuthenticated={isAuthenticated}
            userName={user?.name}
            itemCount={itemCount}
            onLogout={() => void logout()}
          />

          {/* 모바일 우측: 검색 + 카트 + 로그인/마이페이지 */}
          <div className="md:hidden flex items-center gap-1 ml-auto">
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
            {isAuthenticated ? (
              <Link href="/my" aria-label="마이페이지" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login" aria-label="로그인" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            )}
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
          onLogout={() => void logout()}
        />
      )}

      {/* 모바일 검색 오버레이 (헤더 바깥 — sticky 헤더 아래에 fixed로 위치) */}
      <MobileSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
