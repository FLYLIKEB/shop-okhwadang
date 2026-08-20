import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SplitContentContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { isSafeUrl } from '@/utils/url';
import SafeHtml from '@/components/shared/common/SafeHtml';
import { Button } from '@/components/ui/button';

interface Props {
  content: SplitContentContent;
}

export default function SplitContentBlock({ content }: Props) {
  const {
    title,
    subtitle,
    description,
    cta_text,
    cta_url,
    template = 'default',
    use_alternate_bg = false,
  } = content;

  const isLarge = template === 'large';
  const isCompact = template === 'compact';

  const bgClass = use_alternate_bg ? 'bg-muted' : 'bg-background';

  return (
    <div className={cn(bgClass)}>
      <div
        className={cn(
          'mx-auto flex flex-col justify-center w-full',
          isLarge ? 'max-w-5xl px-8 py-24 md:px-16 lg:px-24 lg:py-32' : isCompact ? 'max-w-4xl px-8 py-16 md:px-12 lg:px-20 lg:py-24' : 'max-w-4xl px-8 py-20 md:px-12 lg:px-20 lg:py-28'
        )}
      >
        {subtitle && (
          <p
            className={cn(
              'animate-fade-in-up typo-body-sm font-body font-semibold uppercase tracking-widest text-muted-foreground',
              isLarge ? 'mb-6' : 'mb-5',
            )}
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            {subtitle}
          </p>
        )}
        <h2
          className={cn(
            'animate-fade-in-up font-display text-foreground leading-snug',
            isLarge
              ? 'text-3xl lg:text-4xl'
              : isCompact
                ? 'text-xl lg:text-2xl'
                : 'text-2xl lg:text-3xl',
          )}
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          {title}
        </h2>
        {description && (
          <SafeHtml
            html={description}
            className={cn(
              'animate-fade-in-up typo-body text-muted-foreground prose max-w-none leading-relaxed',
              isLarge ? 'mt-8' : 'mt-6',
            )}
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          />
        )}
        {cta_text && cta_url && (
          <div
            className={cn(
              'flex w-full justify-end animate-fade-in-up',
            )}
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            <Button
              asChild
              variant="black"
              size={isLarge ? 'lg' : 'default'}
              className={cn('gap-2', isLarge ? 'mt-10' : 'mt-8')}
            >
              <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>
                {cta_text}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
