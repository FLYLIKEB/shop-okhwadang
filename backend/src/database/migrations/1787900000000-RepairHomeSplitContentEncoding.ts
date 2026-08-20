import { MigrationInterface, QueryRunner } from 'typeorm';

interface PageBlockRow {
  id: number;
  content: Record<string, unknown> | string | null;
}

function parseContent(content: PageBlockRow['content']): Record<string, unknown> {
  if (!content) return {};
  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return content;
}

export class RepairHomeSplitContentEncoding1787900000000 implements MigrationInterface {
  name = 'RepairHomeSplitContentEncoding1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET NAMES utf8mb4');

    const blocks = await queryRunner.query(
      `SELECT b.id, b.content
         FROM page_blocks b
         INNER JOIN pages p ON p.id = b.page_id
        WHERE p.slug = 'home' AND b.type = 'split_content'`,
    ) as PageBlockRow[];

    for (const block of blocks) {
      const content = parseContent(block.content);
      if (!String(content.title ?? '').includes('?')) continue;

      await queryRunner.query(
        `UPDATE page_blocks SET content = ? WHERE id = ?`,
        [
          JSON.stringify({
            ...content,
            title: '옥화당(玉花堂) 이야기',
            subtitle: 'Our Story',
            description: '옥화당은 중국 의흥(宜興)과 운남(雲南)의 장인들과 직접 교류하며 엄선한 <strong>자사호·보이차·다구</strong>를 국내에 소개하는 전문 D2C 쇼핑몰입니다.<br/><br/><strong>600년 역사</strong>의 자사 도예 문화와 고수차(古樹茶)의 깊은 향미를 그대로 전달하기 위해, 중간 유통 없이 <strong>산지 직수입</strong>을 원칙으로 합니다.',
            cta_text: '브랜드 소개 보기',
          }),
          block.id,
        ],
      );
    }
  }

  public async down(): Promise<void> {
    // Keep repaired content on rollback because the previous values were corrupted.
  }
}
