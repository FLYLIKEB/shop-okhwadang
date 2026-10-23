import { SectionHeading } from '@/components/shared/common/SectionHeading';
import type { ImageCardGridContent } from '@/lib/api';
import { getHeadingId } from './genericBlockUtils';
import CollectionEntry from './CollectionEntry';

export default function ImageCardGridBlock({ content }: { content: ImageCardGridContent }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const headingId = getHeadingId('image-card-grid-heading', content.sectionTitle);

  return (
    <section className="editorial-section collection-index" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label="" title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className="collection-entries">
        {items.map((item) => <CollectionEntry key={item.id} {...item} />)}
      </div>
    </section>
  );
}
