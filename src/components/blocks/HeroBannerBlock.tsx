'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { HeroBannerContent } from '@/lib/api';

interface Props {
  content: HeroBannerContent;
}

export default function HeroBannerBlock({ content }: Props) {
  const { title, subtitle, image_url, cta_text, cta_url, template } = content;

  if (template === 'split') {
    return (
      <section className="flex flex-col overflow-hidden md:flex-row bg-white">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="text-2xl font-medium md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={cta_url}
              className="mt-6 inline-block border border-foreground px-6 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              {cta_text}
            </Link>
          )}
        </div>
        {image_url && (
          <div className="relative aspect-video flex-1">
            <Image src={image_url} alt={title} fill className="object-cover" />
          </div>
        )}
      </section>
    );
  }

  if (template === 'fullscreen') {
    return (
      <section className="relative flex h-[60vh] min-h-[400px] md:h-[80vh] items-center justify-center overflow-hidden bg-neutral-900">
        {image_url && (
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover object-center animate-kenburns"
            priority
            sizes="100vw"
          />
        )}
        {image_url && <div className="absolute inset-0 bg-black/45" />}
        <div className={`relative z-10 text-center px-8 ${image_url ? 'text-white' : ''}`}>
          <h2 className="animate-fade-in-up text-3xl font-medium md:text-5xl" style={{ animationDelay: '0.2s' }}>{title}</h2>
          {subtitle && <p className="animate-fade-in-up mt-4 text-lg opacity-80" style={{ animationDelay: '0.4s' }}>{subtitle}</p>}
          {cta_text && cta_url && (
            <div className="animate-fade-in-up mt-8" style={{ animationDelay: '0.6s' }}>
              <Link
                href={cta_url}
                className="inline-block border border-current px-8 py-3 text-sm font-medium tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
              >
                {cta_text}
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-white">
      {image_url && (
        <div className="relative aspect-video w-full md:aspect-auto md:h-80">
          <Image src={image_url} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className={`${image_url ? 'absolute inset-0' : ''} flex flex-col items-center justify-center p-8 ${image_url ? 'bg-black/30 text-white' : ''}`}>
        <h2 className="text-2xl font-medium md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 text-lg">{subtitle}</p>}
        {cta_text && cta_url && (
          <Link
            href={cta_url}
            className="mt-6 inline-block border border-white px-6 py-3 text-sm font-medium hover:bg-white hover:text-foreground transition-colors"
          >
            {cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}
