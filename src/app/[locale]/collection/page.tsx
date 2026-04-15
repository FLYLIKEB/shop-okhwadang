import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { fetchCollections } from '@/lib/api-server';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { SectionHeading } from '@/components/common/SectionHeading';
import type { Collection } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Collection — 니료별·모양별 큐레이션',
  description:
    '자사호를 니료(泥料)별, 모양별로 탐색하세요. 주니·단니·자니·흑니·청수니·녹니 컬렉션과 서시·석표·인왕·덕종·수평 형태별 큐레이션.',
  openGraph: {
    title: 'Collection — 옥화당',
    description: '니료별·모양별 자사호 큐레이션 컬렉션',
  },
};

function ClayCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={collection.productUrl}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div
        className="h-40 transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: collection.color ?? '#888' }}
        role="img"
        aria-label={`${collection.nameKo ?? collection.name} 색상`}
      />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: collection.color ?? '#888' }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {collection.name}
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {collection.nameKo ?? collection.name}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {collection.description}
        </p>
        <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
          컬렉션 보기 →
        </span>
      </div>
    </Link>
  );
}

function ShapeCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={collection.productUrl}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-40 bg-muted overflow-hidden">
        {collection.imageUrl ? (
          <Image
            src={collection.imageUrl}
            alt={`${collection.name} 형태 자사호`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {collection.name}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground mb-1">
          {collection.name}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {collection.description}
        </p>
        <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
          컬렉션 보기 →
        </span>
      </div>
    </Link>
  );
}

function ClaySkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <SkeletonBox height="h-40" className="!rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonBox width="w-2.5 h-2.5" className="!rounded-full" />
          <SkeletonBox width="w-20 h-3" />
        </div>
        <SkeletonBox width="w-32 h-5" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-3/4 h-4" />
        <SkeletonBox width="w-24 h-4 mt-4" />
      </div>
    </div>
  );
}

function ShapeSkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <SkeletonBox height="h-40" className="!rounded-none" />
      <div className="p-5 space-y-3">
        <SkeletonBox width="w-32 h-5" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-3/4 h-4" />
        <SkeletonBox width="w-24 h-4 mt-4" />
      </div>
    </div>
  );
}

interface CollectionPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  await params;

  let clayCollections: Collection[] = [];
  let shapeCollections: Collection[] = [];

  let fetchError: Error | null = null;

  try {
    const data = await fetchCollections();
    clayCollections = data.clay;
    shapeCollections = data.shape;
  } catch (err) {
    fetchError = err instanceof Error ? err : new Error('컬렉션 데이터를 불러오지 못했습니다.');
    clayCollections = [];
    shapeCollections = [];
  }

  if (fetchError) {
    throw fetchError;
  }

  return (
    <div className="min-h-screen">
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">
          Collection
        </p>
        <h1 className="font-display typo-h1 tracking-tight mb-4">
          니료별 · 모양별 큐레이션
        </h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          자사호의 개성은 흙과 형태에서 비롯됩니다. 니료의 색과 질감, 형태의 선과
          비례로 나만의 자사호를 찾아보세요.
        </p>
      </section>

      <section
        className="py-20 px-4 max-w-6xl mx-auto"
        aria-labelledby="clay-collection-heading"
      >
        <SectionHeading
          id="clay-collection-heading"
          label="니료별"
          title="흙의 색으로 찾기"
          description="6종의 니료는 각기 다른 색상, 질감, 차 궁합을 지닙니다. 관심 있는 니료를 선택해보세요."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clayCollections.length > 0 ? (
            clayCollections.map((clay) => (
              <ClayCard key={clay.id} collection={clay} />
            ))
          ) : (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <ClaySkeletonCard key={i} />
              ))}
            </>
          )}
        </div>
      </section>

      <hr className="border-border" />

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shapeCollections.length > 0 ? (
            shapeCollections.map((shape) => (
              <ShapeCard key={shape.id} collection={shape} />
            ))
          ) : (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <ShapeSkeletonCard key={i} />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="bg-muted py-16 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Shop
        </p>
        <h2 className="font-display typo-h2 text-foreground mb-4">
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
