import type { Metadata } from 'next';
import Link from 'next/link';
import { CLAY_COLLECTIONS, SHAPE_COLLECTIONS } from '@/lib/collections';

export const metadata: Metadata = {
  title: 'Collection — 니로별·모양별 큐레이션',
  description:
    '자사호를 니로(泥料)별, 모양별로 탐색하세요. 주니·단니·자니·흑니·청수니·녹니 컬렉션과 서시·석표·인왕·덕종·수평 형태별 큐레이션.',
  openGraph: {
    title: 'Collection — 옥화당',
    description: '니로별·모양별 자사호 큐레이션 컬렉션',
  },
};

function SectionHeading({
  id,
  label,
  title,
  description,
}: {
  id?: string;
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <h2 id={id} className="mt-2 font-display-ko text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export default function CollectionPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">
          Collection
        </p>
        <h1 className="font-display-ko text-4xl font-bold tracking-tight mb-4">
          니로별 · 모양별 큐레이션
        </h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          자사호의 개성은 흙과 형태에서 비롯됩니다. 니로의 색과 질감, 형태의 선과
          비례로 나만의 자사호를 찾아보세요.
        </p>
      </section>

      {/* 니로별 컬렉션 */}
      <section
        className="py-20 px-4 max-w-6xl mx-auto"
        aria-labelledby="clay-collection-heading"
      >
        <SectionHeading
          id="clay-collection-heading"
          label="니로별"
          title="흙의 색으로 찾기"
          description="6종의 니로는 각기 다른 색상, 질감, 차 궁합을 지닙니다. 관심 있는 니로를 선택해보세요."
        />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CLAY_COLLECTIONS.map((clay) => (
            <Link
              key={clay.id}
              href={clay.productUrl}
              className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
            >
              {/* 컬러 블록 */}
              <div
                className="h-40 transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: clay.color }}
                role="img"
                aria-label={`${clay.nameKo} 색상`}
              />
              {/* 텍스트 */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: clay.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {clay.name}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {clay.nameKo}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {clay.description}
                </p>
                <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
                  컬렉션 보기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 구분선 */}
      <hr className="border-border" />

      {/* 모양별 컬렉션 */}
      <section
        className="py-20 px-4 max-w-6xl mx-auto"
        aria-labelledby="shape-collection-heading"
      >
        <SectionHeading
          id="shape-collection-heading"
          label="모양별"
          title="형태의 선으로 찾기"
          description="자사호의 대표적인 5가지 형태. 각 형태가 지닌 미학과 기능을 탐색해보세요."
        />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SHAPE_COLLECTIONS.map((shape) => (
            <Link
              key={shape.id}
              href={shape.productUrl}
              className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
            >
              {/* 형태 플레이스홀더 */}
              <div
                className="h-40 bg-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                role="img"
                aria-label={`${shape.name} 형태`}
              >
                <span
                  className="text-4xl text-muted-foreground/40"
                  aria-hidden="true"
                >
                  壺
                </span>
              </div>
              {/* 텍스트 */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {shape.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {shape.description}
                </p>
                <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
                  컬렉션 보기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA 푸터 */}
      <section className="bg-muted py-16 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Shop
        </p>
        <h2 className="font-display-ko text-2xl font-bold text-foreground mb-4">
          전체 상품을 둘러보세요
        </h2>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium bg-foreground text-background rounded px-6 py-3 hover:opacity-80 transition-opacity"
        >
          전체 상품 보기 →
        </Link>
      </section>
    </div>
  );
}
