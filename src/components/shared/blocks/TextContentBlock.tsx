import SafeHtml from '@/components/shared/common/SafeHtml';
import { cn } from '@/components/ui/utils';
import type { TextContentContent } from '@/lib/api';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html, textAlign = 'center', template = 'default' } = content;
  const isHighlight = template === 'highlight';

  return (
    <section
      className={cn(
        'my-12 md:my-20',
        isHighlight && 'rounded-2xl border border-primary/30 bg-primary/5 px-6 py-8 md:px-10',
      )}
      data-template={template}
    >
      {!isHighlight && <hr className="border-divider-soft" />}
      <SafeHtml
        html={html}
        className={cn(
          'prose max-w-none py-6',
          isHighlight && 'text-foreground [&_a]:font-medium [&_a]:text-primary [&_strong]:text-primary',
        )}
        style={{ textAlign }}
      />
      {!isHighlight && <hr className="border-divider-soft" />}
    </section>
  );
}
