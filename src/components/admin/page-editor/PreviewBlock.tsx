import type { DraftBlock } from '@/components/admin/page-editor/SortableBlockItem';

// --- Preview block renderers ---

function PreviewHeroBanner({ content }: { content: Record<string, unknown> }) {
  const imageUrl = content.image_url as string;
  const title = content.title as string;
  const subtitle = content.subtitle as string;
  const ctaText = content.cta_text as string;
  return (
    <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-gray-200">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="relative z-10 text-center">
        {title && <h2 className="text-2xl font-bold drop-shadow">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm text-gray-700 drop-shadow">{subtitle}</p>}
        {ctaText && (
          <span className="mt-3 inline-block rounded bg-foreground px-4 py-2 text-sm text-background">
            {ctaText}
          </span>
        )}
        {!title && !subtitle && !imageUrl && (
          <span className="text-sm text-muted-foreground">히어로 배너 (내용 없음)</span>
        )}
      </div>
    </div>
  );
}

function PreviewProductGrid({ content }: { content: Record<string, unknown> }) {
  const title = content.title as string;
  const template = (content.template as string) ?? '3col';
  const limit = (content.limit as number) ?? 8;
  const colMap: Record<string, string> = { '2col': 'grid-cols-2', '3col': 'grid-cols-3', '4col': 'grid-cols-4' };
  const colClass = colMap[template] ?? 'grid-cols-3';
  return (
    <div>
      {title && <h3 className="mb-3 font-semibold">{title}</h3>}
      <div className={`grid gap-2 ${colClass}`}>
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            상품 {i + 1}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{template} · 최대 {limit}개</p>
    </div>
  );
}

function PreviewProductCarousel({ content }: { content: Record<string, unknown> }) {
  const title = content.title as string;
  const limit = (content.limit as number) ?? 8;
  return (
    <div>
      {title && <h3 className="mb-3 font-semibold">{title}</h3>}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <div key={i} className="h-24 w-20 shrink-0 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {i + 1}
          </div>
        ))}
        <div className="flex h-24 w-8 shrink-0 items-center justify-center text-muted-foreground">›</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">캐러셀 · 최대 {limit}개</p>
    </div>
  );
}

function PreviewCategoryNav({ content }: { content: Record<string, unknown> }) {
  const template = (content.template as string) ?? 'text';
  const categories = ['상의', '하의', '아우터', '신발', '가방'];
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <span key={cat} className="rounded-full border px-3 py-1 text-sm">
          {template === 'icon' ? '◆ ' : ''}{cat}
        </span>
      ))}
      <p className="w-full mt-1 text-xs text-muted-foreground">카테고리 내비 · {template} 스타일</p>
    </div>
  );
}

function PreviewPromotionBanner({ content }: { content: Record<string, unknown> }) {
  const imageUrl = content.image_url as string;
  const title = content.title as string;
  const subtitle = content.subtitle as string;
  const ctaText = content.cta_text as string;
  const expiresAt = content.expires_at as string;
  return (
    <div className="relative flex min-h-32 items-center justify-between overflow-hidden rounded-lg bg-orange-50 px-6">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="relative z-10">
        {title && <h3 className="text-lg font-bold text-orange-900">{title}</h3>}
        {subtitle && <p className="text-sm text-orange-700">{subtitle}</p>}
        {expiresAt && <p className="mt-1 text-xs text-orange-500">~ {expiresAt}</p>}
        {!title && !subtitle && <span className="text-sm text-muted-foreground">프로모션 배너 (내용 없음)</span>}
      </div>
      {ctaText && (
        <span className="relative z-10 shrink-0 rounded bg-orange-500 px-4 py-2 text-sm text-white">
          {ctaText}
        </span>
      )}
    </div>
  );
}

function PreviewTextContent({ content }: { content: Record<string, unknown> }) {
  const html = content.html as string;
  const textAlign = (content.textAlign as 'left' | 'center' | 'right') ?? 'center';
  if (!html) return <p className="text-sm text-muted-foreground">텍스트 블록 (내용 없음)</p>;
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return <p className="whitespace-pre-wrap text-sm" style={{ textAlign }}>{plainText}</p>;
}

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero_banner: '히어로 배너',
  product_grid: '상품 그리드',
  product_carousel: '상품 캐러셀',
  category_nav: '카테고리 내비',
  promotion_banner: '프로모션 배너',
  text_content: '텍스트',
};

export default function PreviewBlock({ block }: { block: DraftBlock }) {
  switch (block.type) {
    case 'hero_banner':
      return <PreviewHeroBanner content={block.content} />;
    case 'product_grid':
      return <PreviewProductGrid content={block.content} />;
    case 'product_carousel':
      return <PreviewProductCarousel content={block.content} />;
    case 'category_nav':
      return <PreviewCategoryNav content={block.content} />;
    case 'promotion_banner':
      return <PreviewPromotionBanner content={block.content} />;
    case 'text_content':
      return <PreviewTextContent content={block.content} />;
  }
}
