import SafeHtml from '@/components/shared/common/SafeHtml';
import { cn } from '@/components/ui/utils';
import type { TextContentContent } from '@/lib/api';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html, textAlign = 'left', template = 'default' } = content;
  const isHighlight = template === 'highlight';

  return (
    <section
      className={cn(
        'my-12 md:my-20',
        isHighlight
          ? 'rounded-lg border border-primary/30 bg-primary/5 px-6 py-8 md:px-10'
          : 'border-y border-divider-soft bg-background/80 py-8 md:py-12',
      )}
      data-template={template}
    >
      <SafeHtml
        html={html}
        className={cn(
          'prose max-w-none',
          'prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground',
          'prose-h2:typo-h2 prose-h2:mb-4 prose-h2:mt-10 first:prose-h2:mt-0',
          'prose-h3:typo-h3 prose-h3:mb-3 prose-h3:mt-8',
          'prose-p:typo-body prose-p:text-muted-foreground',
          'prose-li:typo-body prose-li:text-muted-foreground',
          'prose-ul:my-4 prose-ul:pl-5 prose-ol:my-4 prose-ol:pl-5',
          'prose-a:font-medium prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline',
          'prose-table:typo-body-sm prose-table:block prose-table:w-full prose-table:overflow-x-auto',
          'prose-th:border prose-th:border-border prose-th:bg-surface prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-foreground',
          'prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-3 prose-td:text-muted-foreground',
          'prose-strong:text-foreground',
          textAlign === 'center' && 'mx-auto text-center',
          textAlign === 'right' && 'text-right',
          isHighlight && '[&_a]:font-medium [&_a]:text-primary [&_strong]:text-primary',
        )}
      />
    </section>
  );
}
