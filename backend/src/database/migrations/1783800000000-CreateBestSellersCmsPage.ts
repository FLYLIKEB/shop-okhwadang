import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBestSellersCmsPage1783800000000 implements MigrationInterface {
  name = 'CreateBestSellersCmsPage1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`pages\` (\`slug\`, \`title\`, \`title_en\`, \`template\`, \`is_published\`)
       VALUES ('best', '베스트', 'Best Sellers', 'default', 1)
       ON DUPLICATE KEY UPDATE
         \`title\` = VALUES(\`title\`),
         \`title_en\` = COALESCE(NULLIF(\`title_en\`, ''), VALUES(\`title_en\`)),
         \`template\` = VALUES(\`template\`),
         \`is_published\` = VALUES(\`is_published\`)`,
    );

    const [page] = await queryRunner.query(`SELECT id FROM \`pages\` WHERE \`slug\` = 'best' LIMIT 1`);
    if (!page) return;

    const textContent = {
      html: '<h1>베스트</h1><p>옥화당에서 가장 많은 사랑을 받은 상품을 모았습니다.</p>',
      html_en: '<h1>Best Sellers</h1><p>Discover the most-loved pieces from Ockhwadang.</p>',
      textAlign: 'center',
      template: 'default',
    };
    const gridContent = {
      title: '베스트 상품',
      title_en: 'Best Sellers',
      sort: 'popular',
      limit: 12,
      template: '4col',
    };

    const [existingText] = await queryRunner.query(
      `SELECT id FROM \`page_blocks\` WHERE \`page_id\` = ? AND \`type\` = 'text_content' AND \`sort_order\` = 0 LIMIT 1`,
      [page.id],
    );
    if (!existingText) {
      await queryRunner.query(
        `INSERT INTO \`page_blocks\` (\`page_id\`, \`type\`, \`content\`, \`sort_order\`, \`is_visible\`)
         VALUES (?, 'text_content', ?, 0, 1)`,
        [page.id, JSON.stringify(textContent)],
      );
    }

    const [existingGrid] = await queryRunner.query(
      `SELECT id FROM \`page_blocks\` WHERE \`page_id\` = ? AND \`type\` = 'product_grid' AND \`sort_order\` = 1 LIMIT 1`,
      [page.id],
    );
    if (!existingGrid) {
      await queryRunner.query(
        `INSERT INTO \`page_blocks\` (\`page_id\`, \`type\`, \`content\`, \`sort_order\`, \`is_visible\`)
         VALUES (?, 'product_grid', ?, 1, 1)`,
        [page.id, JSON.stringify(gridContent)],
      );
    }

    await queryRunner.query(
      `INSERT INTO \`navigation_items\` (\`id\`, \`group\`, \`label\`, \`label_en\`, \`url\`, \`sort_order\`, \`is_active\`, \`parent_id\`)
       VALUES (104, 'gnb', '베스트', 'Best Sellers', '/p/best', 3, 1, NULL)
       ON DUPLICATE KEY UPDATE
         \`label\` = VALUES(\`label\`),
         \`label_en\` = VALUES(\`label_en\`),
         \`url\` = VALUES(\`url\`),
         \`sort_order\` = VALUES(\`sort_order\`),
         \`is_active\` = VALUES(\`is_active\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`navigation_items\`
       SET \`url\` = '/products?sort=popular'
       WHERE \`id\` = 104 AND \`group\` = 'gnb' AND \`url\` = '/p/best'`,
    );

    const [page] = await queryRunner.query(`SELECT id FROM \`pages\` WHERE \`slug\` = 'best' LIMIT 1`);
    if (!page) return;

    await queryRunner.query(`DELETE FROM \`page_blocks\` WHERE \`page_id\` = ?`, [page.id]);
    await queryRunner.query(`DELETE FROM \`pages\` WHERE \`id\` = ?`, [page.id]);
  }
}
