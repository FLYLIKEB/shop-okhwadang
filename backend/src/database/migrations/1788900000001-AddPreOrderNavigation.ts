import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreOrderNavigation1788900000001 implements MigrationInterface {
  name = 'AddPreOrderNavigation1788900000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const group of ['gnb', 'sidebar']) {
      await queryRunner.query(
        `INSERT INTO navigation_items (\`group\`, label, label_en, url, sort_order, is_active, parent_id)
         SELECT ?, 'PRE-ORDER', 'PRE-ORDER', '/pre-order', 20, 1, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM navigation_items WHERE \`group\` = ? AND url = '/pre-order'
         )`,
        [group, group],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM navigation_items
       WHERE \`group\` IN ('gnb', 'sidebar') AND url = '/pre-order'
         AND label = 'PRE-ORDER' AND label_en = 'PRE-ORDER'
         AND sort_order = 20 AND parent_id IS NULL`,
    );
  }
}
