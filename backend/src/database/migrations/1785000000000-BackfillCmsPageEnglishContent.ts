import { MigrationInterface, QueryRunner } from 'typeorm';

type JsonRecord = Record<string, unknown>;

interface BlockRow {
  id: number;
  slug: string;
  type: string;
  content: JsonRecord | string | null;
}

function parseContent(content: BlockRow['content']): JsonRecord {
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

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function viewLabel(name: unknown): string | undefined {
  return nonEmpty(name) ? `View ${name} pieces` : undefined;
}

export class BackfillCmsPageEnglishContent1785000000000 implements MigrationInterface {
  name = 'BackfillCmsPageEnglishContent1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.backfillKnownPageBlocks(queryRunner);
    await this.backfillGenericCollectionBlocks(queryRunner);
  }

  public async down(): Promise<void> {
    // Data-only English backfill. Keep translations on rollback to avoid removing admin-authored content.
  }

  private async backfillKnownPageBlocks(queryRunner: QueryRunner): Promise<void> {
    const textBlocks: Array<{ slug: string; type: string; sortOrder?: number; content: JsonRecord }> = [
      {
        slug: 'best',
        type: 'text_content',
        sortOrder: 0,
        content: {
          html_en: '<h1>Best Sellers</h1><p>Discover the most-loved pieces from Ockhwadang.</p>',
        },
      },
      {
        slug: 'best',
        type: 'product_grid',
        sortOrder: 1,
        content: { title_en: 'Best Sellers' },
      },
      {
        slug: 'support',
        type: 'split_content',
        content: {
          title_en: 'How Can We Help You?',
          subtitle_en: 'CUSTOMER CENTER',
          description_en: 'Find quick answers through FAQs, notices, and one-on-one inquiries.',
          cta_text_en: 'Contact Us',
        },
      },
      {
        slug: 'shipping',
        type: 'text_content',
        content: {
          html_en: '<h2>Shipping Information</h2><p>Ockhwadang ships orders within 2–3 business days after order confirmation, excluding weekends and holidays.</p><h3>Shipping Costs</h3><ul><li><strong>Standard Shipping:</strong> 3,000 KRW; remote-area surcharges may apply.</li><li><strong>Free Shipping:</strong> Orders over 50,000 KRW.</li><li><strong>Carrier:</strong> CJ Korea Express.</li></ul><p>Tracking is available from your order details page.</p>',
        },
      },
    ];

    for (const item of textBlocks) {
      const rows = await this.findBlocks(queryRunner, item.slug, item.type, item.sortOrder);
      for (const row of rows) {
        const content = { ...parseContent(row.content), ...item.content };
        await this.updateBlock(queryRunner, row.id, content);
      }
    }
  }

  private async backfillGenericCollectionBlocks(queryRunner: QueryRunner): Promise<void> {
    const niloTypes = await queryRunner.query(
      `SELECT id, name, nameKo, name_en, characteristics_en FROM nilo_types WHERE is_active = 1`,
    ) as Array<Record<string, unknown>>;
    const clayCollections = await queryRunner.query(
      `SELECT id, name, nameKo, name_en FROM collections WHERE is_active = 1 AND type = 'clay'`,
    ) as Array<Record<string, unknown>>;
    const shapeCollections = await queryRunner.query(
      `SELECT id, name, name_en FROM collections WHERE is_active = 1 AND type = 'shape'`,
    ) as Array<Record<string, unknown>>;

    const byId = (rows: Array<Record<string, unknown>>) =>
      new Map(rows.map((row) => [String(row.id), row]));

    const dictionaries: Record<string, Map<string, Record<string, unknown>>> = {
      nilo: byId(niloTypes),
      'collection-clay': byId(clayCollections),
      'collection-shape': byId(shapeCollections),
    };

    const blocks = await queryRunner.query(
      `SELECT b.id, p.slug, b.type, b.content
         FROM page_blocks b
         INNER JOIN pages p ON p.id = b.page_id
        WHERE p.slug IN ('archive', 'collection')
          AND b.type IN ('color_card_list', 'image_card_grid')`,
    ) as BlockRow[];

    for (const block of blocks) {
      const content = parseContent(block.content);
      if (!Array.isArray(content.items)) continue;

      const items = content.items.map((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') return rawItem;
        const item = { ...(rawItem as JsonRecord) };
        const id = String(item.id ?? '');
        const sourceKey = id.startsWith('nilo-')
          ? 'nilo'
          : id.startsWith('collection-clay-')
            ? 'collection-clay'
            : id.startsWith('collection-shape-')
              ? 'collection-shape'
              : '';
        const sourceId = id.replace(`${sourceKey}-`, '');
        const source = dictionaries[sourceKey]?.get(sourceId);
        const englishName = source?.name_en ?? source?.name ?? item.nameEn ?? item.name_en;

        if (nonEmpty(englishName)) {
          item.name_en = englishName;
          item.nameEn = englishName;
        }
        const label = viewLabel(englishName);
        if (label) item.hrefLabel_en = label;

        if (Array.isArray(source?.characteristics_en)) {
          item.characteristics_en = source.characteristics_en;
        } else if (nonEmpty(source?.characteristics_en)) {
          try {
            item.characteristics_en = JSON.parse(source.characteristics_en) as unknown;
          } catch {
            item.characteristics_en = source.characteristics_en;
          }
        }

        return item;
      });

      await this.updateBlock(queryRunner, block.id, { ...content, items });
    }
  }

  private findBlocks(
    queryRunner: QueryRunner,
    slug: string,
    type: string,
    sortOrder?: number,
  ): Promise<BlockRow[]> {
    const sortClause = sortOrder === undefined ? '' : 'AND b.sort_order = ?';
    const args = sortOrder === undefined ? [slug, type] : [slug, type, sortOrder];
    return queryRunner.query(
      `SELECT b.id, p.slug, b.type, b.content
         FROM page_blocks b
         INNER JOIN pages p ON p.id = b.page_id
        WHERE p.slug = ? AND b.type = ? ${sortClause}`,
      args,
    ) as Promise<BlockRow[]>;
  }

  private updateBlock(queryRunner: QueryRunner, id: number, content: JsonRecord): Promise<unknown> {
    return queryRunner.query(
      `UPDATE page_blocks SET content = ? WHERE id = ?`,
      [JSON.stringify(content), id],
    ) as Promise<unknown>;
  }
}
