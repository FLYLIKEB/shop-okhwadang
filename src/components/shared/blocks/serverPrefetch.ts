import { fetchArchives, fetchCollections } from '@/lib/api-server';
import type { PageBlock } from '@/lib/api';

export async function withArchiveBlockPrefetch(blocks: PageBlock[], locale: string): Promise<PageBlock[]> {
  const hasArchiveBlock = blocks.some((block) =>
    ['archive_nilo', 'archive_process', 'archive_artist'].includes(block.type),
  );
  if (!hasArchiveBlock) return blocks;

  const archives = await fetchArchives(locale);
  return blocks.map((block) => {
    if (!['archive_nilo', 'archive_process', 'archive_artist'].includes(block.type)) {
      return block;
    }

    return {
      ...block,
      content: {
        ...block.content,
        prefetchedArchives: archives,
      },
    };
  });
}

export async function withCollectionBlockPrefetch(blocks: PageBlock[], locale: string): Promise<PageBlock[]> {
  const hasCollectionBlock = blocks.some((block) =>
    ['collection_clay', 'collection_shape'].includes(block.type),
  );
  if (!hasCollectionBlock) return blocks;

  const collections = await fetchCollections(locale);
  return blocks.map((block) => {
    if (!['collection_clay', 'collection_shape'].includes(block.type)) {
      return block;
    }

    return {
      ...block,
      content: {
        ...block.content,
        prefetchedCollections: collections,
      },
    };
  });
}
