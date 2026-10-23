import Image from 'next/image';
import Link from 'next/link';
import type { SplitContentContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { isSafeUrl } from '@/utils/url';
import SafeHtml from '@/components/shared/common/SafeHtml';

interface Props {
  content: SplitContentContent;
}

export default function SplitContentBlock({ content }: Props) {
  const { title, subtitle, description, image_url, image_derivatives, image_position, cta_text, cta_url, template = 'default', use_alternate_bg = false } = content;

  return (
    <section
      aria-label={title}
      className={cn(
        'editorial-split',
        use_alternate_bg && 'editorial-split--gray',
        !image_url && 'editorial-split--text-only',
        image_position === 'left' && 'editorial-split--image-left',
        template === 'large' && 'editorial-split--large',
        template === 'compact' && 'editorial-split--compact',
      )}
    >
      <div className="editorial-split__copy">
        <div className="editorial-split__intro">
          {subtitle && <p className="editorial-split__subtitle">{subtitle}</p>}
          <h2>{title}</h2>
        </div>
        {(description || (cta_text && cta_url)) && (
          <div className="editorial-split__outro">
            {description && <SafeHtml html={description} className="editorial-split__description" />}
            {cta_text && cta_url && (
              <Link href={isSafeUrl(cta_url) ? cta_url : '#'} className="editorial-split__link">
                {cta_text}
              </Link>
            )}
          </div>
        )}
      </div>
      {image_url && (
        <div className="editorial-split__media">
          <Image
            src={image_derivatives?.desktop ?? image_url}
            alt={title}
            fill
            sizes="(min-width: 1024px) 67vw, 100vw"
            className="object-cover object-bottom grayscale"
          />
        </div>
      )}
    </section>
  );
}
