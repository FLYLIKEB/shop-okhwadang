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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GRID_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group block"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-opacity duration-500 group-hover:opacity-90"
              />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
