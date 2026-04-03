import type { TextContentContent } from '@/lib/api';
import SafeHtml from '@/components/common/SafeHtml';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html, textAlign = 'center' } = content;

  return (
    <section className="my-8">
      <hr className="border-border" />
      <SafeHtml html={html} className="prose max-w-none py-6" style={{ textAlign }} />
      <hr className="border-border" />
    </section>
  );
}
