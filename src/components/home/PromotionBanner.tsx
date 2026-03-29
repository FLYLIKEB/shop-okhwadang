import Link from 'next/link';

export default function PromotionBanner() {
  return (
    <section>
      <Link
        href="/products"
        className="block rounded-xl bg-gradient-to-r from-slate-800 to-slate-600 px-8 py-12 text-center text-white hover:opacity-95 transition-opacity"
      >
        <p className="text-sm font-medium uppercase tracking-widest text-slate-300 mb-2">
          Special Offer
        </p>
        <h3 className="text-2xl font-bold mb-1">지금 바로 쇼핑하세요</h3>
        <p className="text-slate-300 text-sm">다양한 상품을 둘러보세요</p>
      </Link>
    </section>
  );
}
