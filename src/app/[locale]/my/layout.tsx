import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <div className="toss-account checkout-toss-theme min-h-screen">{children}</div>;
}
