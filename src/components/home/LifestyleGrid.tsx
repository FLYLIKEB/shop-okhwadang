import Image from 'next/image';
import Link from 'next/link';

const GRID_ITEMS = [
  {
    id: 1,
    title: '자사호 · 보이차',
    subtitle: '엄선된 차와 다호의 만남',
    href: '/products?category=teapot',
    src: 'https://picsum.photos/seed/teapot/800/600',
    alt: '자사호와 보이차',
  },
  {
    id: 2,
    title: '다구 세팅',
    subtitle: '격을 갖춘 찻자리 준비',
    href: '/products?category=teaware',
    src: 'https://picsum.photos/seed/teaware/800/600',
    alt: '다구 세팅',
  },
  {
    id: 3,
    title: '계절 찻자리',
    subtitle: '사계절의 정취를 담다',
    href: '/products?category=seasonal',
    src: 'https://picsum.photos/seed/seasonal/800/600',
    alt: '계절 찻자리',
  },
] as const;

export default function LifestyleGrid() {
  return (
    <section aria-label="찻자리 라이프스타일">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GRID_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative block overflow-hidden rounded-xl aspect-video"
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 transition-colors duration-300 group-hover:bg-black/30" />
            {/* Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
              <h3 className="text-xl font-bold mb-1 drop-shadow">{item.title}</h3>
              <p className="text-sm text-white/80 mb-4 drop-shadow">{item.subtitle}</p>
              <span className="inline-block rounded-full border border-white/70 px-5 py-1.5 text-sm font-medium transition-colors duration-300 group-hover:bg-white group-hover:text-slate-900">
                찻자리 보기
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
