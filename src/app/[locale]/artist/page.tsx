import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ARTISTS, CLAY_FILTERS, localizeArtist } from '@/lib/artists';
import type { ClayFilter } from '@/lib/artists';

export const metadata: Metadata = {
  title: 'Artisans | Ockhwadang',
  description: 'Meet the Yixing artisans who craft Ockhwadang teapots.',
};

interface ArtistPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ clay?: string }>;
}

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'artistPage' });
  const query = await searchParams;
  const selectedClay = query.clay ?? '';
  const clay = (CLAY_FILTERS as readonly string[]).includes(selectedClay)
    ? (selectedClay as ClayFilter)
    : '전체';

  const filtered = clay === '전체' ? ARTISTS : ARTISTS.filter((a) => a.clay === clay);
  const clayFilterLabel = (filter: ClayFilter) => {
    if (filter === '전체') return t('all');
    const artist = ARTISTS.find((item) => item.clay === filter);
    return locale === 'en' ? (artist?.clayEn ?? filter) : filter;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </header>

      {/* 니료 필터 */}
      <nav aria-label={t('clayFilter')} className="mb-8 flex flex-wrap gap-2">
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
              {clayFilterLabel(filter)}
            </Link>
          );
        })}
      </nav>

      {/* 장인 카드 그리드 */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((baseArtist) => {
          const artist = localizeArtist(baseArtist, locale);
          return <li key={artist.slug}>
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
                  <span className="text-lg font-bold text-foreground">{artist.displayName}</span>
                  <span className="text-sm text-muted-foreground">{artist.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {artist.displayClay} · {artist.displayWorkshop}
                </p>
                <p className="mt-2 text-sm text-foreground">{artist.displaySpecialty}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('worksCount', { count: artist.productCount })}
                </p>
              </div>
            </Link>
          </li>;
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          {t('noArtists')}
        </p>
      )}
    </div>
  );
}
