import Link from 'next/link';

export default function PromotionBanner() {
  return (
    <section className="py-12 border-t border-b border-border">
      <div className="text-center">
        <p className="text-sm tracking-widest text-muted-foreground uppercase mb-3">Special Offer</p>
        <h3 className="text-2xl font-medium mb-2">지금 바로 쇼핑하세요</h3>
        <p className="text-muted-foreground text-sm mb-6">다양한 상품을 둘러보세요</p>
        <Link
          href="/products"
          className="inline-block border border-foreground px-8 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          쇼핑하기
        </Link>
      </div>
    </section>
  );
}
