import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal — 차와 흙, 그리고 사람의 이야기',
  description:
    '다문화의 깊이, 자사호 사용법, 찻자리 세팅, 옥화당 소식. 차를 사랑하는 이들을 위한 읽을거리.',
  openGraph: {
    title: 'Journal — 옥화당',
    description: '다문화·사용법·찻자리 세팅·소식',
  },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
