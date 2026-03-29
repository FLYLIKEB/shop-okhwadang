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
      <section className="flex flex-col overflow-hidden rounded-xl bg-gray-100 md:flex-row">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={cta_url}
              className="mt-4 inline-block w-fit rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
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
      <section className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        {image_url && <Image src={image_url} alt={title} fill className="object-cover" />}
        <div className="relative z-10 text-center text-white">
          <h2 className="text-3xl font-bold drop-shadow-lg md:text-5xl">{title}</h2>
          {subtitle && <p className="mt-2 text-lg drop-shadow-md">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={cta_url}
              className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-gray-100"
            >
              {cta_text}
            </Link>
          )}
        </div>
      </section>
    );
  }

  // Default: slider template
  return (
    <section className="relative overflow-hidden rounded-xl bg-gray-100">
      {image_url && (
        <div className="relative aspect-video w-full md:aspect-auto md:h-80">
          <Image src={image_url} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className={`${image_url ? 'absolute inset-0' : ''} flex flex-col items-center justify-center p-8 ${image_url ? 'bg-black/30 text-white' : ''}`}>
        <h2 className="text-2xl font-bold drop-shadow-lg md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 text-lg drop-shadow-md">{subtitle}</p>}
        {cta_text && cta_url && (
          <Link
            href={cta_url}
            className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-gray-100"
          >
            {cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}
