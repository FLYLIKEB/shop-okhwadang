import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getArtistBySlug, ARTISTS } from '@/lib/artists';

interface ArtistDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTISTS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: ArtistDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) return { title: '장인을 찾을 수 없습니다' };

  return {
    title: `${artist.nameKo} ${artist.name} | 옥화당 장인`,
    description: artist.bio,
  };
}

export default async function ArtistDetailPage({ params }: ArtistDetailProps) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* 뒤로가기 */}
      <Link
        href="/artist"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← 장인 목록
      </Link>

      {/* 에디토리얼 헤더 */}
      <header className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        {/* 프로파일 이미지 placeholder */}
        <div className="aspect-square w-full max-w-sm rounded-lg bg-muted flex items-center justify-center mx-auto md:mx-0">
          <span className="text-8xl font-bold text-muted-foreground/20 select-none">
            {artist.name.slice(0, 1)}
          </span>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            {artist.workshop} 공방
          </p>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {artist.nameKo}
          </h1>
          <p className="mt-1 text-xl text-muted-foreground">{artist.name}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div>
              <dt className="text-xs text-muted-foreground">대표 니로</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{artist.clay}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">전문 분야</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{artist.specialty}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">작품 수</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{artist.productCount}점</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">공방 소재지</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{artist.workshop}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* 장인 스토리 */}
      <section aria-labelledby="story-heading" className="mt-14">
        <h2 id="story-heading" className="text-lg font-bold text-foreground mb-6">
          장인 이야기
        </h2>
        <div className="space-y-4 border-l-2 border-border pl-6">
          {artist.story.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* 대표 작품 갤러리 */}
      <section aria-labelledby="gallery-heading" className="mt-14">
        <h2 id="gallery-heading" className="text-lg font-bold text-foreground mb-6">
          대표 작품
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="aspect-square rounded-lg bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground/50">작품 {i + 1}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-lg border border-border bg-muted/40 p-8 text-center">
        <h2 className="text-base font-bold text-foreground">
          {artist.nameKo}의 작품 컬렉션
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {artist.nameKo} 장인이 빚은 {artist.clay} 자사호를 만나보세요.
        </p>
        <Link
          href={`/products?artist=${encodeURIComponent(artist.nameKo)}`}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          이 장인의 작품 보기
        </Link>
      </section>
    </div>
  );
}
