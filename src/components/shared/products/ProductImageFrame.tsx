'use client';

import { useState, type ReactNode } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';
import type { Locale } from '@/utils/currency';

type ProductImageFrameProps = {
  imageUrl?: string | null;
  alt: string;
  sizes: string;
  frameClassName: string;
  imageClassName: string;
  frameTestId: string;
  fallbackTestId: string;
  fallbackLogoAlt: string;
  fallbackLogoWidth: number;
  fallbackLogoHeight: number;
  href?: string;
  locale?: Locale;
  loading?: ImageProps['loading'];
  priority?: boolean;
  children?: ReactNode;
};

export default function ProductImageFrame({
  imageUrl,
  alt,
  sizes,
  frameClassName,
  imageClassName,
  frameTestId,
  fallbackTestId,
  fallbackLogoAlt,
  fallbackLogoWidth,
  fallbackLogoHeight,
  href,
  locale,
  loading,
  priority = false,
  children,
}: ProductImageFrameProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(imageUrl) && !hasImageError;

  const imageContent = shouldShowImage ? (
    <Image
      src={imageUrl as string}
      alt={alt}
      fill
      sizes={sizes}
      className={imageClassName}
      loading={loading}
      priority={priority}
      onError={() => setHasImageError(true)}
    />
  ) : (
    <div data-testid={fallbackTestId} className="flex h-full w-full items-center justify-center bg-neutral-200">
      <Image
        src="/logo-okhwadang.png"
        alt={fallbackLogoAlt}
        width={fallbackLogoWidth}
        height={fallbackLogoHeight}
        className="object-contain opacity-70 grayscale"
      />
    </div>
  );

  return (
    <div data-testid={frameTestId} className={cn('relative overflow-hidden', frameClassName)}>
      {href ? (
        <Link href={href} locale={locale} className="block h-full" aria-label={alt}>
          {imageContent}
        </Link>
      ) : (
        imageContent
      )}
      {children}
    </div>
  );
}
