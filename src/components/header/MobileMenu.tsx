'use client';

import { useState } from 'react';
import { X, User, LogOut, LogIn, UserPlus, MessageSquare, Package, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { getHeaderNavigationLabel } from './navigationLabel';
import { localMessage } from '@/utils/localMessages';
import type { NavigationItem } from '@/lib/api';

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string;
  userRole?: string;
  navItems: NavigationItem[];
  sidebarItems: NavigationItem[];
  visible: boolean;
  onClose: () => void;
  onNavigate: () => void;
  onLogout: () => void;
}

interface HistoryEntry {
  title: string;
  items: NavigationItem[];
}

interface MobileMenuHeaderProps {
  onClose: () => void;
}

function MobileMenuHeader({ onClose }: MobileMenuHeaderProps) {
  const tNav = useTranslations('navigation');
  return (
    <div className="flex items-center px-4 h-14 shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="p-2 -ml-2 mr-3 text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90"
        aria-label={tNav('closeMenu')}
      >
        <X className="h-5 w-5" />
      </button>
      <Link href="/" onClick={onClose} className="shrink-0">
        <Logo variant="header" />
      </Link>
    </div>
  );
}

interface MobileMenuContentProps {
  items: NavigationItem[];
  history: HistoryEntry[];
  onItemClick: (item: NavigationItem) => void;
  onBack: () => void;
  onLinkClick: () => void;
}

function MobileMenuContent({ items, history, onItemClick, onBack, onLinkClick }: MobileMenuContentProps) {
  const panels = [{ title: '', items }, ...history];
  const activeIndex = panels.length - 1;
  const tHeader = useTranslations('header');

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        data-testid="mobile-menu-track"
        className="absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {panels.map((panel, index) => {
          const isActive = index === activeIndex;
          const title = getHeaderNavigationLabel(panel.title);
          return (
            <div
              key={`${panel.title}-${index}`}
              className="absolute top-0 bottom-0 w-full overflow-y-auto px-4 py-4"
              style={{ left: `${index * 100}%` }}
              aria-hidden={!isActive}
            >
              {index > 0 && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={localMessage('header.menuBackTo', { title })}
                  tabIndex={isActive ? 0 : -1}
                  className="mb-3 flex min-h-11 w-full items-center gap-3 py-2 text-left typo-body-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M12 5l-5 5 5 5" />
                  </svg>
                  {title || tHeader('menuBack')}
                </button>
              )}
              <div className="flex flex-col gap-1">
                {panel.items.map((item) => {
                  const label = getHeaderNavigationLabel(item.label);
                  return (
                    <div key={item.id}>
                      {item.children && item.children.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => isActive && onItemClick(item)}
                          tabIndex={isActive ? 0 : -1}
                          aria-label={localMessage('header.openSubmenu', { label })}
                          className="w-full min-h-11 py-3 text-left typo-body-sm text-foreground hover:text-muted-foreground transition-colors flex items-center justify-between"
                        >
                          {label}
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                            <path d="M6 4l4 4-4 4" />
                          </svg>
                        </button>
                      ) : (
                        <Link
                          href={item.url}
                          onClick={onLinkClick}
                          tabIndex={isActive ? 0 : -1}
                          className="block min-h-11 py-3 typo-body-sm text-foreground hover:text-muted-foreground transition-colors"
                        >
                          {label}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MobileMenuFooterProps {
  isAuthenticated: boolean;
  userName?: string;
  userRole?: string;
  onLogout: () => void;
  onLinkClick: () => void;
}

function MobileMenuFooter({ isAuthenticated, userName, userRole, onLogout, onLinkClick }: MobileMenuFooterProps) {
  const t = useTranslations('header');
  const orderTrackingHref = isAuthenticated ? '/my/orders' : '/login?redirect=/my/orders';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  return (
    <div className="px-4 py-4 shrink-0">
      <div className="flex flex-col gap-1">
        {isAuthenticated ? (
          <>
            <Link href="/my" onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
              <User className="h-4 w-4" />
              {userName ?? t('myPage')}
            </Link>
            <button
              type="button"
              onClick={() => { onLinkClick(); onLogout(); }}
              className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-3"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
              <LogIn className="h-4 w-4" />
              {t('login')}
            </Link>
            <Link href="/register" onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
              <UserPlus className="h-4 w-4" />
              {t('createAccount')}
            </Link>
          </>
        )}
        <Link href="/contact" onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
          <MessageSquare className="h-4 w-4" />
          {t('contact')}
        </Link>
        <Link href={orderTrackingHref} onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
          <Package className="h-4 w-4" />
          {t('orderTracking')}
        </Link>
        {isAdmin && (
          <Link href="/admin" onClick={onLinkClick} className="min-h-11 py-2 typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3">
            <Shield className="h-4 w-4" />
            {t('adminPanel')}
          </Link>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <LanguageSelector variant="inline" />
        <ThemeToggle />
      </div>
    </div>
  );
}

function MobileMenuBackdrop({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-black/40 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function MobileMenuNav({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const tNav = useTranslations('navigation');
  return (
    <nav
      aria-label={tNav('mobileMenu')}
      className={cn(
        'absolute left-0 top-0 h-full w-80 bg-background shadow-xl transition-transform duration-500 ease-out',
        visible ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="relative w-full h-full overflow-y-auto overflow-x-hidden">
        <div className="absolute inset-0 flex flex-col">
          {children}
        </div>
      </div>
    </nav>
  );
}

export function MobileMenu({ isAuthenticated, userName, userRole, navItems, sidebarItems, visible, onClose, onNavigate, onLogout }: MobileMenuProps) {
  const menuItems = sidebarItems.length > 0 ? sidebarItems : navItems;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const resetAndRun = (callback: () => void) => {
    setHistory([]);
    callback();
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      setHistory(h => [...h, { title: getHeaderNavigationLabel(item.label), items: item.children }]);
    } else {
      handleNavigateClose();
    }
  };

  const handleBack = () => {
    setHistory(h => h.slice(0, -1));
  };

  const handleMenuClose = () => resetAndRun(onClose);

  const handleNavigateClose = () => resetAndRun(onNavigate);

  return (
    <div id="mobile-menu" className="fixed inset-0 z-50 lg:hidden">
      <MobileMenuBackdrop visible={visible} onClose={handleMenuClose} />
      <MobileMenuNav visible={visible}>
        <MobileMenuHeader onClose={handleMenuClose} />
        <MobileMenuContent
          items={menuItems}
          history={history}
          onItemClick={handleItemClick}
          onBack={handleBack}
          onLinkClick={handleNavigateClose}
        />
        <MobileMenuFooter
          isAuthenticated={isAuthenticated}
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
          onLinkClick={handleNavigateClose}
        />
      </MobileMenuNav>
    </div>
  );
}
