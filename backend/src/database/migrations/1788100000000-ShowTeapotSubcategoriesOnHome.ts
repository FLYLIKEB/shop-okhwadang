import { MigrationInterface, QueryRunner } from 'typeorm';

interface CategoryRow {
  id: number | string;
}

interface PageBlockRow {
  id: number | string;
  content: unknown;
}

function parseContent(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, unknown>) }
      : {};
  }

  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function isLegacyHomeCategorySelection(value: unknown): boolean {
  return Array.isArray(value)
    && value.length === 4
    && value.every((id, index) => Number(id) === index + 1);
}

export class ShowTeapotSubcategoriesOnHome1788100000000 implements MigrationInterface {
  name = 'ShowTeapotSubcategoriesOnHome1788100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const parentRows = await queryRunner.query(
      'SELECT `id` FROM `categories` WHERE `slug` = ? LIMIT 1',
      ['teapot'],
    ) as CategoryRow[];
    const parentId = parentRows[0]?.id;
    if (parentId === undefined) return;

    const childRows = await queryRunner.query(
      'SELECT `id` FROM `categories` WHERE `parent_id` = ? AND `is_active` = 1 ORDER BY `sort_order` ASC, `id` ASC',
      [parentId],
    ) as CategoryRow[];
    const childIds = childRows.map((row) => Number(row.id));
    if (childIds.length === 0) return;

    const blocks = await queryRunner.query(
      `SELECT pb.id, pb.content
       FROM page_blocks pb
       INNER JOIN pages p ON p.id = pb.page_id
       WHERE p.slug = ? AND pb.type = 'category_nav'`,
      ['home'],
    ) as PageBlockRow[];

    for (const block of blocks) {
      const content = parseContent(block.content);
      if (!isLegacyHomeCategorySelection(content.category_ids)) continue;

      content.category_ids = childIds;
      await queryRunner.query(
        'UPDATE `page_blocks` SET `content` = ? WHERE `id` = ?',
        [JSON.stringify(content), block.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const blocks = await queryRunner.query(
      `SELECT pb.id, pb.content
       FROM page_blocks pb
       INNER JOIN pages p ON p.id = pb.page_id
       WHERE p.slug = ? AND pb.type = 'category_nav'`,
      ['home'],
    ) as PageBlockRow[];

    for (const block of blocks) {
      const content = parseContent(block.content);
      content.category_ids = [1, 2, 3, 4];
      await queryRunner.query(
        'UPDATE `page_blocks` SET `content` = ? WHERE `id` = ?',
        [JSON.stringify(content), block.id],
      );
    }
  }
}
