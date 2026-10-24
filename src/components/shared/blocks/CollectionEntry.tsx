'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
import { InlineHtmlText } from './genericBlockUtils';

interface Props {
  name: string;
  imageUrl?: string;
  description: string;
  details?: string;
  href?: string;
  hrefLabel?: string;
  texture?: boolean;
}

export default function CollectionEntry({ name, imageUrl, description, details, href, hrefLabel, texture }: Props) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const showImage = Boolean(imageUrl && imageUrl !== failedImageUrl);

  return (
    <article className={cn('collection-entry', !showImage && 'collection-entry--text-only')}>
      {showImage && imageUrl && (
        <div className="collection-entry__media">
          <Image
            src={imageUrl}
            onError={() => setFailedImageUrl(imageUrl)}
            alt={name}
            fill
            sizes="(max-width: 640px) 40vw, 280px"
            className={cn('object-cover', texture && 'collection-entry__texture')}
          />
        </div>
      )}
      <div className="collection-entry__copy">
        <h3>{name}</h3>
        <InlineHtmlText html={description} className="collection-entry__description" />
        {details && <p className="collection-entry__details">{details}</p>}
        {href && <Link className="editorial-link" href={href}>{hrefLabel || name}</Link>}
      </div>
    </article>
  );
}
