import { MigrationInterface, QueryRunner } from 'typeorm';

type JsonRecord = Record<string, unknown>;

interface BlockRow {
  id: number;
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

/**
 * archive 페이지의 person_card_list(작가) 블록 아이템에 `hrefLabel_en` 을 채운다.
 *
 * 기존 `hrefLabel` 은 "작품 보기"(한국어)로만 저장되어 있어 영어 페이지에서
 * `applyLocaleToContent` 가 영어 값으로 치환하지 못하고 한글이 그대로 노출됐다.
 * name_en(영문 이름)이 있으면 "View {name} pieces", 없으면 "View pieces" 로 설정한다.
 */
export class BackfillArchiveArtistHrefLabelEn1785700000000 implements MigrationInterface {
  name = 'BackfillArchiveArtistHrefLabelEn1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const blocks = (await queryRunner.query(
      `SELECT b.id, b.content
         FROM page_blocks b
         INNER JOIN pages p ON p.id = b.page_id
        WHERE p.slug = 'archive' AND b.type = 'person_card_list'`,
    )) as BlockRow[];

    for (const block of blocks) {
      const content = parseContent(block.content);
      if (!Array.isArray(content.items)) continue;

      let changed = false;
      const items = content.items.map((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') return rawItem;
        const item = { ...(rawItem as JsonRecord) };
        if (!nonEmpty(item.hrefLabel_en)) {
          const englishName = item.name_en ?? item.nameEn;
          item.hrefLabel_en = nonEmpty(englishName) ? `View ${englishName} pieces` : 'View pieces';
          changed = true;
        }
        return item;
      });

      if (changed) {
        await queryRunner.query(`UPDATE page_blocks SET content = ? WHERE id = ?`, [
          JSON.stringify({ ...content, items }),
          block.id,
        ]);
      }
    }
  }

  public async down(): Promise<void> {
    // Data-only English backfill. Keep translations on rollback to avoid removing admin-authored content.
  }
}
