'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationItem } from '@/lib/api';

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const ShoppingBagIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const SOCIAL_LINKS: {
  id: 'instagram' | 'naver';
  href: string;
  icon: ({ size }: { size?: number }) => React.ReactElement;
}[] = [
  {
    id: 'instagram',
    href: 'https://www.instagram.com/ockhwadang',
    icon: InstagramIcon,
  },
  {
    id: 'naver',
    href: 'https://smartstore.naver.com/ockhwadang',
    icon: ShoppingBagIcon,
  },
];

function renderNavLinks(items: NavigationItem[]) {
  return items.map((item) => (
    <Link
      key={item.id}
      href={item.url}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {item.label}
    </Link>
  ));
}

export default function Footer() {
  const t = useTranslations('footer');
  const { items: footerItems, loading } = useNavigation('footer');
  const hasCmsData = !loading && footerItems.length > 0;
  const rootItems = hasCmsData ? footerItems.filter((item) => item.parent_id === null) : [];

  const socialLabels: Record<'instagram' | 'naver', string> = {
    instagram: 'Instagram',
    naver: 'Naver Smart Store',
  };

  return (
    <footer className="mt-auto border-t border-divider-soft bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
          <div>
            <p className="text-sm font-medium text-foreground mb-4">{t('customerService')}</p>
            <nav className="flex flex-col gap-2">
              {renderNavLinks(rootItems.slice(0, 4))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-4">{t('company')}</p>
            <nav className="flex flex-col gap-2">
              {renderNavLinks(rootItems.slice(4, 6))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-4">{t('shop')}</p>
            <nav className="flex flex-col gap-2">
              {renderNavLinks(rootItems.slice(6, 10))}
            </nav>
          </div>

          <div>
            <Image src="/logo-okhwadang.png" alt={t('okhwadang')} width={120} height={34} className="object-contain mb-4" />
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>{t('tagline')}</p>
              <p>{t('specialty')}</p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[social.id]}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 공방 서명/낙관 영역 */}
        <div className="mt-12 border-t border-dashed border-divider-soft pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="font-display text-lg text-muted-foreground/50">玉華堂</span>
            <div className="font-mono text-xs text-muted-foreground text-center md:text-right space-y-0.5 tracking-wide">
              <p>&copy; {new Date().getFullYear()} OCKHWADANG. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
