'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import type { StorefrontBusinessInfo as FooterBusinessInfo } from '@/lib/storefront-shell';

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

function getFooterHref(item: NavigationItem): string {
  if (item.url === '/pages/shipping' || item.url === '/pages/returns') {
    return '/shipping-returns';
  }
  return item.url;
}

function renderNavLinks(items: NavigationItem[]) {
  return items.map((item) => (
    <Link
      key={item.id}
      href={getFooterHref(item)}
      prefetch={false}
      className="toss-footer__link typo-body-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {item.label}
    </Link>
  ));
}

interface FooterProps {
  businessInfo?: FooterBusinessInfo;
  initialFooterItems?: NavigationItem[] | null;
}

export default function Footer({ businessInfo, initialFooterItems }: FooterProps) {
  const t = useTranslations('footer');
  const { items: footerItems, loading } = useNavigation('footer', initialFooterItems);
  const hasCmsData = !loading && footerItems.length > 0;
  const rootItems = hasCmsData ? footerItems.filter((item) => item.parent_id === null) : [];
  const currentYear = new Date().getFullYear();

  const socialLabels: Record<'instagram' | 'naver', string> = {
    instagram: t('social.instagram'),
    naver: t('social.naverStore'),
  };

  // Settings values take priority; fall back to i18n for safety
  const companyName = businessInfo?.companyName ?? t('businessInfo.companyName');
  const ceo = businessInfo?.ceo ?? t('businessInfo.ceo');
  const address = businessInfo?.address ? t('businessInfo.addressLabel', { value: businessInfo.address }) : t('businessInfo.address');
  const bizNo = businessInfo?.bizNo ? t('businessInfo.bizNoLabel', { value: businessInfo.bizNo }) : t('businessInfo.bizNo');
  const mailOrderNo = businessInfo?.mailOrderNo
    ? t('businessInfo.mailOrderNoLabel', { value: businessInfo.mailOrderNo })
    : t('businessInfo.mailOrderNo');
  const phone = businessInfo?.phone ? t('businessInfo.phoneLabel', { value: businessInfo.phone }) : t('businessInfo.phone');
  const email = businessInfo?.email ? t('businessInfo.emailLabel', { value: businessInfo.email }) : t('businessInfo.email');
  const hours = businessInfo?.hours ? t('businessInfo.hoursLabel', { value: businessInfo.hours }) : t('businessInfo.hours');
  const lunchTime = businessInfo?.lunchTime ? t('businessInfo.lunchTimeLabel', { value: businessInfo.lunchTime }) : t('businessInfo.lunchTime');
  const holidays = businessInfo?.holidays ? t('businessInfo.holidaysLabel', { value: businessInfo.holidays }) : t('businessInfo.holidays');
  const privacyOfficer = businessInfo?.privacyOfficer
    ? t('businessInfo.privacyOfficerLabel', { value: businessInfo.privacyOfficer })
    : t('businessInfo.privacyOfficer');
  const infoUrl = businessInfo?.infoUrl ?? '';

  return (
    <footer className="toss-footer mt-auto border-t border-soft bg-card">
      <div className="toss-footer__inner mx-auto max-w-7xl px-5 py-10 md:px-4 md:py-12">
        <div className={`toss-footer__grid grid grid-cols-2 gap-x-6 gap-y-8 transition-opacity duration-300 md:grid-cols-4 md:gap-8 ${loading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="toss-footer__group text-center md:text-left">
            <p className="typo-label font-semibold tracking-tight text-foreground">{t('customerService')}</p>
            <nav className="mt-3 flex flex-col items-center gap-2 md:items-start">
              {renderNavLinks(rootItems.slice(0, 4))}
            </nav>
          </div>

          <div className="toss-footer__group text-center md:text-left">
            <p className="typo-label font-semibold tracking-tight text-foreground">{t('company')}</p>
            <nav className="mt-3 flex flex-col items-center gap-2 md:items-start">
              {renderNavLinks(rootItems.slice(4, 6))}
            </nav>
          </div>

          <div className="toss-footer__group text-center md:text-left">
            <p className="typo-label font-semibold tracking-tight text-foreground">{t('shop')}</p>
            <nav className="mt-3 flex flex-col items-center gap-2 md:items-start">
              {renderNavLinks(rootItems.slice(6, 10))}
            </nav>
          </div>

          <div className="toss-footer__brand order-first col-span-2 flex flex-col items-center text-center md:order-none md:col-span-1 md:items-start md:text-left">
            <Image src="/logo-okhwadang.png" alt={t('okhwadang')} width={120} height={34} className="mb-4 h-auto w-[104px] object-contain md:w-[120px]" />
            <div className="flex flex-col gap-1 typo-body-sm text-muted-foreground">
              <p>{t('tagline')}</p>
              <p>{t('specialty')}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[social.id]}
                  className="toss-footer__social inline-flex min-h-10 items-center gap-2 rounded-full bg-muted px-3 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <social.icon size={18} />
                  <span className="typo-body-sm">{socialLabels[social.id]}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 사업자 정보 (전자상거래법 제10조) */}
        <div className="toss-footer__business mt-10 border-t border-soft pt-6 text-center md:mt-12 md:pt-8">
          <div className="typo-body-sm space-y-0.5 leading-relaxed text-muted-foreground/70">
            <p>{companyName} · {ceo}</p>
            <p>{address}</p>
            <p>{bizNo} · {mailOrderNo}</p>
            <p>{phone} · {email}</p>
            <p>{hours}</p>
            <p>{lunchTime} · {holidays}</p>
            <p>{privacyOfficer}</p>
            {infoUrl ? (
              <p>
                <a href={infoUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {t('businessInfo.infoUrlLabel')}
                </a>
              </p>
            ) : null}
          </div>

          <p className="mt-6 typo-body-sm font-body text-muted-foreground">
            {t('copyright', { year: currentYear })}
          </p>
        </div>
      </div>
    </footer>
  );
}
