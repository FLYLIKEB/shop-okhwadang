import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTISTS, CLAY_FILTERS } from '@/lib/artists';
import type { ClayFilter } from '@/lib/artists';

export const metadata: Metadata = {
  title: '장인 | 옥화당',
  description: '옥화당 자사호를 빚는 장인들을 만나보세요.',
};

interface ArtistPageProps {
  searchParams: Promise<{ clay?: string }>;
}

export default async function ArtistPage({ searchParams }: ArtistPageProps) {
  const params = await searchParams;
  const clay = (CLAY_FILTERS as readonly string[]).includes(params.clay ?? '')
    ? (params.clay as ClayFilter)
    : '전체';

  const filtered = clay === '전체' ? ARTISTS : ARTISTS.filter((a) => a.clay === clay);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">장인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          옥화당의 자사호를 빚는 의흥 장인들
        </p>
      </header>

      {/* 니로 필터 */}
      <nav aria-label="니로 필터" className="mb-8 flex flex-wrap gap-2">
        {CLAY_FILTERS.map((filter) => {
          const isActive = clay === filter;
          const href = filter === '전체' ? '/artist' : `/artist?clay=${encodeURIComponent(filter)}`;
          return (
            <Link
              key={filter}
              href={href}
              className={
                isActive
                  ? 'rounded-full border border-foreground bg-foreground px-4 py-1.5 text-sm font-medium text-background'
                  : 'rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors'
              }
            >
              {filter}
            </Link>
          );
        })}
      </nav>

      {/* 장인 카드 그리드 */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((artist) => (
          <li key={artist.slug}>
            <Link
              href={`/artist/${artist.slug}`}
              className="group block overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
            >
              {/* 프로파일 이미지 placeholder */}
              <div className="aspect-square w-full bg-muted flex items-center justify-center">
                <span className="text-5xl font-bold text-muted-foreground/30 select-none">
                  {artist.name.slice(0, 1)}
                </span>
              </div>

              <div className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">{artist.nameKo}</span>
                  <span className="text-sm text-muted-foreground">{artist.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {artist.clay} · {artist.workshop}
                </p>
                <p className="mt-2 text-sm text-foreground">{artist.specialty}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  작품 {artist.productCount}점
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          해당 니로의 장인이 없습니다.
        </p>
      )}
    </div>
  );
}
