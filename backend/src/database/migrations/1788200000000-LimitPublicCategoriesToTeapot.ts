import { MigrationInterface, QueryRunner } from 'typeorm';

interface CategoryRow {
  id: number | string;
  parent_id: number | string | null;
  slug: string;
}

export class LimitPublicCategoriesToTeapot1788200000000 implements MigrationInterface {
  name = 'LimitPublicCategoriesToTeapot1788200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const categories = await queryRunner.query(
      'SELECT `id`, `parent_id`, `slug` FROM `categories`',
    ) as CategoryRow[];
    const teapot = categories.find((category) => category.slug === 'teapot');
    if (!teapot) return;

    const teapotIds = new Set<number>([Number(teapot.id)]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parent_id !== null && teapotIds.has(Number(category.parent_id))) {
          const categoryId = Number(category.id);
          if (!teapotIds.has(categoryId)) {
            teapotIds.add(categoryId);
            changed = true;
          }
        }
      }
    }

    for (const category of categories) {
      const categoryId = Number(category.id);
      if (!teapotIds.has(categoryId)) {
        await queryRunner.query(
          'UPDATE `categories` SET `is_active` = 0 WHERE `id` = ?',
          [categoryId],
        );
      }
    }
  }

  async down(): Promise<void> {
    // The previous active state is not recoverable without restoring unrelated catalog data.
  }
}
