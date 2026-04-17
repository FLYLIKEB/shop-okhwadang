import type { Metadata } from 'next';
import '@/styles/globals.css';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: {
    default: '옥화당 - 자사호 전문 쇼핑몰',
    template: '%s | 옥화당',
  },
  description: '옥화당은 자사호, 보이차, 다구 전문 브랜드입니다. 한국 전통차 문화를 다양한 자사호 제품과 함께 전해드립니다.',
  keywords: ['자사호', '보이차', '다구', '한국차', '옥화당', '자사호 쇼핑몰', '차 도구', '전통차'],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: '옥화당',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
