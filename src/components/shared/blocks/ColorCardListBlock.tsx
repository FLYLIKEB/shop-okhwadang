import { SectionHeading } from '@/components/shared/common/SectionHeading';
import type { ColorCardListContent } from '@/lib/api';
import { getHeadingId } from './genericBlockUtils';
import CollectionEntry from './CollectionEntry';

export default function ColorCardListBlock({ content }: { content: ColorCardListContent }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const headingId = getHeadingId('color-card-list-heading', content.sectionTitle);

  return (
    <section className="editorial-section collection-index" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label="" title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className="collection-entries">
        {items.map((item) => (
          <CollectionEntry
            key={item.id}
            name={item.name ?? item.nameKo}
            imageUrl={item.imageUrl}
            description={item.description}
            details={[item.region, ...(item.characteristics ?? [])].filter(Boolean).join(' · ')}
            href={item.href}
            hrefLabel={item.hrefLabel}
            texture
          />
        ))}
      </div>
    </section>
  );
}
