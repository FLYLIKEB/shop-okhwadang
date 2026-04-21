import type { TextContentContent } from '@/lib/api';
import SafeHtml from '@/components/shared/common/SafeHtml';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html, textAlign = 'center' } = content;

  return (
    <section className="my-12 md:my-20">
      <hr className="border-divider-soft" />
      <SafeHtml html={html} className="prose max-w-none py-6" style={{ textAlign }} />
      <hr className="border-divider-soft" />
    </section>
  );
}
