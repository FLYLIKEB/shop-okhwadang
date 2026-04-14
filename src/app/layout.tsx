import type { Metadata } from 'next';
import '@/styles/globals.css';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: {
    default: '옥화당',
    template: '%s | 옥화당',
  },
  description: '자사호·보이차·다구 전문 쇼핑몰',
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
