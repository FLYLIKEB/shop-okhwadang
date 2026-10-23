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
        'editorial-section border-t border-border py-6',
        isHighlight
          ? 'text-foreground'
          : 'text-muted-foreground',
      )}
      data-template={template}
    >
      <SafeHtml
        html={html}
        className={cn(
          'prose max-w-none text-xs',
          'prose-headings:font-display prose-headings:font-medium prose-headings:text-foreground',
          'prose-h2:text-base prose-h2:mb-4 prose-h2:mt-10 first:prose-h2:mt-0',
          'prose-h3:text-sm prose-h3:mb-3 prose-h3:mt-8',
          'prose-p:text-xs prose-p:text-muted-foreground',
          'prose-li:text-xs prose-li:text-muted-foreground',
          'prose-ul:my-4 prose-ul:pl-5 prose-ol:my-4 prose-ol:pl-5',
          'prose-a:font-medium prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:underline',
          'prose-table:text-xs prose-table:block prose-table:w-full prose-table:overflow-x-auto',
          'prose-th:border prose-th:border-border prose-th:bg-transparent prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-foreground',
          'prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-3 prose-td:text-muted-foreground',
          'prose-strong:text-foreground',
          textAlign === 'center' && 'mx-auto text-center',
          textAlign === 'right' && 'text-right',
          isHighlight && '[&_strong]:text-foreground',
        )}
      />
    </section>
  );
}
