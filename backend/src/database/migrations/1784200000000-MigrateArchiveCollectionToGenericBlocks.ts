import { MigrationInterface, QueryRunner } from 'typeorm';

type JsonRecord = Record<string, unknown>;

interface LegacyBlock {
  id: number;
  type: string;
  content: JsonRecord | string | null;
}

function parseContent(content: LegacyBlock['content']): JsonRecord {
  if (!content) return {};
  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as JsonRecord;
    } catch {
      return {};
    }
  }
  return content;
}

function withEnglish(base: JsonRecord, source: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = source[`${field}_en`];
    if (value !== null && value !== undefined && value !== '') {
      base[`${field}_en`] = value;
    }
  }
  return base;
}

async function getBlocks(queryRunner: QueryRunner, slug: string, types: string[]): Promise<LegacyBlock[]> {
  return queryRunner.query(
    `SELECT b.id, b.type, b.content
       FROM page_blocks b
       INNER JOIN pages p ON p.id = b.page_id
      WHERE p.slug = ? AND b.type IN (${types.map(() => '?').join(',')})
      ORDER BY b.sort_order ASC`,
    [slug, ...types],
  );
}

export class MigrateArchiveCollectionToGenericBlocks1784200000000 implements MigrationInterface {
  name = 'MigrateArchiveCollectionToGenericBlocks1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const niloTypes = await queryRunner.query(
      `SELECT id, name, nameKo, name_en, color, region, region_en, description, description_en,
              characteristics, characteristics_en, product_url
         FROM nilo_types WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    const processSteps = await queryRunner.query(
      `SELECT id, step, title, title_en, description, description_en, detail, detail_en
         FROM process_steps ORDER BY step ASC, id ASC`,
    );
    const artists = await queryRunner.query(
      `SELECT id, name, name_en, title, title_en, region, region_en, story, story_en,
              specialty, specialty_en, image_url, product_url
         FROM artists WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
    );
    const clayCollections = await queryRunner.query(
      `SELECT id, name, nameKo, name_en, color, description, description_en, product_url
         FROM collections WHERE is_active = 1 AND type = 'clay' ORDER BY sort_order ASC, id ASC`,
    );
    const shapeCollections = await queryRunner.query(
      `SELECT id, name, name_en, description, description_en, imageUrl, product_url
         FROM collections WHERE is_active = 1 AND type = 'shape' ORDER BY sort_order ASC, id ASC`,
    );

    const blocks = [
      ...(await getBlocks(queryRunner, 'archive', ['archive_nilo', 'archive_process', 'archive_artist'])),
      ...(await getBlocks(queryRunner, 'collection', ['collection_clay', 'collection_shape'])),
    ];

    for (const block of blocks) {
      const content = parseContent(block.content);
      let nextType = block.type;
      let nextContent: JsonRecord = content;

      if (block.type === 'archive_nilo') {
        nextType = 'color_card_list';
        nextContent = {
          ...content,
          layout: 'alternating',
          items: niloTypes.map((item: Record<string, unknown>) => withEnglish({
            id: `nilo-${item.id}`,
            color: item.color,
            nameEn: item.name_en ?? item.name,
            nameKo: item.nameKo,
            region: item.region,
            description: item.description,
            characteristics: Array.isArray(item.characteristics) ? item.characteristics : JSON.parse(String(item.characteristics ?? '[]')),
            href: item.product_url,
            hrefLabel: `${item.nameKo} 작품 보기`,
          }, item, ['region', 'description'])),
        };
      }

      if (block.type === 'archive_process') {
        nextType = 'timeline_list';
        nextContent = {
          ...content,
          items: processSteps.map((item: Record<string, unknown>) => withEnglish({
            id: `process-${item.id}`,
            step: item.step,
            label: item.description,
            label_en: item.description_en,
            title: item.title,
            title_en: item.title_en,
            description: item.detail,
            description_en: item.detail_en,
          }, item, [])),
        };
      }

      if (block.type === 'archive_artist') {
        nextType = 'person_card_list';
        nextContent = {
          ...content,
          items: artists.map((item: Record<string, unknown>) => withEnglish({
            id: `artist-${item.id}`,
            imageUrl: item.image_url ?? '',
            title: item.title,
            name: item.name,
            region: item.region,
            specialty: item.specialty,
            story: item.story,
            href: item.product_url,
            hrefLabel: '작품 보기',
          }, item, ['title', 'name', 'region', 'specialty', 'story'])),
        };
      }

      if (block.type === 'collection_clay') {
        nextType = 'color_card_list';
        nextContent = {
          ...content,
          layout: 'grid-3',
          items: clayCollections.map((item: Record<string, unknown>) => withEnglish({
            id: `collection-clay-${item.id}`,
            color: item.color ?? '#888888',
            nameEn: item.name_en ?? item.name,
            nameKo: item.nameKo ?? item.name,
            description: item.description ?? '',
            href: item.product_url,
            hrefLabel: `${item.nameKo ?? item.name} 작품 보기`,
          }, item, ['description'])),
        };
      }

      if (block.type === 'collection_shape') {
        nextType = 'image_card_grid';
        nextContent = {
          ...content,
          columns: 3,
          items: shapeCollections.map((item: Record<string, unknown>) => withEnglish({
            id: `collection-shape-${item.id}`,
            imageUrl: item.imageUrl ?? '',
            name: item.name,
            description: item.description ?? '',
            href: item.product_url,
            hrefLabel: `${item.name} 보기`,
          }, item, ['name', 'description'])),
        };
      }

      await queryRunner.query(
        `UPDATE page_blocks SET type = ?, content = ? WHERE id = ?`,
        [nextType, JSON.stringify(nextContent), block.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const replacements: Array<[string, string, string]> = [
      ['archive', 'color_card_list', 'archive_nilo'],
      ['archive', 'timeline_list', 'archive_process'],
      ['archive', 'person_card_list', 'archive_artist'],
      ['collection', 'color_card_list', 'collection_clay'],
      ['collection', 'image_card_grid', 'collection_shape'],
    ];

    for (const [slug, fromType, toType] of replacements) {
      await queryRunner.query(
        `UPDATE page_blocks b
          INNER JOIN pages p ON p.id = b.page_id
             SET b.type = ?,
                 b.content = JSON_REMOVE(b.content, '$.items', '$.layout', '$.columns')
           WHERE p.slug = ? AND b.type = ?`,
        [toType, slug, fromType],
      );
    }
  }
}
