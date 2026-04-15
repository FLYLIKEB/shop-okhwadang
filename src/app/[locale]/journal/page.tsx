import JournalListClient from '@/components/shared/journal/JournalListClient';

export default function JournalPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="typo-label tracking-widest uppercase text-background/60 mb-3">
          Journal
        </p>
        <h1 className="font-display typo-h1 tracking-tight mb-4">
          차와 흙, 그리고 사람의 이야기
        </h1>
        <p className="max-w-xl mx-auto typo-body text-background/80">
          다문화의 깊이, 자사호 사용법, 아름다운 찻자리 세팅, 옥화당 소식까지.
          차를 사랑하는 이들을 위한 읽을거리를 모았습니다.
        </p>
      </section>

      {/* 필터 + 목록 */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <JournalListClient />
      </section>
    </div>
  );
}
