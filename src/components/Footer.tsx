'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import type { StorefrontBusinessInfo as FooterBusinessInfo } from '@/lib/storefront-shell';

import type { NavigationItem } from '@/lib/api';

const SOCIAL_LINKS: {
  id: 'instagram' | 'naver';
  href: string;
}[] = [
  {
    id: 'instagram',
    href: 'https://www.instagram.com/ockhwadang',
  },
  {
    id: 'naver',
    href: 'https://smartstore.naver.com/ockhwadang',
  },
];

function getFooterHref(item: NavigationItem): string {
  if (item.url === '/pages/shipping' || item.url === '/pages/returns') {
    return '/shipping-returns';
  }
  return item.url;
}

function renderNavLinks(items: NavigationItem[]): React.ReactElement[] {
  return items.flatMap((item) => [(
    <Link
      key={item.id}
      href={getFooterHref(item)}
      prefetch={false}
      className="toss-footer__link"
    >
      {item.label}
    </Link>
  ), ...renderNavLinks(item.children ?? [])]);
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
    <footer className="toss-footer mt-auto">
      <div className="toss-footer__inner">
        <nav className="toss-footer__social" aria-label={t('social.label')}>
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.id}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="toss-footer__link"
            >
              {socialLabels[social.id]}
            </a>
          ))}
        </nav>
        <nav className="toss-footer__nav" aria-label={t('customerService')} aria-busy={loading}>
          {renderNavLinks(rootItems.slice(0, 4))}
        </nav>
        <nav className="toss-footer__nav" aria-label={t('shop')} aria-busy={loading}>
          {renderNavLinks(rootItems.slice(4))}
        </nav>
        <div className="toss-footer__contact" aria-label={t('businessInfo.contact')}>
          <p>{companyName} · {ceo}</p>
          <p>{phone}</p>
          <p>{email}</p>
          <p>{hours}</p>
          <p>{lunchTime} · {holidays}</p>
        </div>
        <div className="toss-footer__business">
          <p>{bizNo} · {mailOrderNo}</p>
          <p>{address}</p>
          <p>{privacyOfficer}</p>
          {infoUrl && (
            <a href={infoUrl} target="_blank" rel="noopener noreferrer" className="toss-footer__link">
              {t('businessInfo.infoUrlLabel')}
            </a>
          )}
          <p>{t('copyright', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  );
}
