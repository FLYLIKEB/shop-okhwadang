import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeduplicateCollectionFilterOptions1785900000000 implements MigrationInterface {
  name = 'DeduplicateCollectionFilterOptions1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`collections\` c
      INNER JOIN (
        SELECT \`type\`, \`product_url\`, MAX(\`id\`) AS keep_id
        FROM \`collections\`
        WHERE \`type\` IN ('clay', 'shape')
          AND \`product_url\` LIKE '/products?attrs=%'
        GROUP BY \`type\`, \`product_url\`
        HAVING COUNT(*) > 1
      ) dup ON dup.\`type\` = c.\`type\` AND dup.\`product_url\` = c.\`product_url\`
      SET c.\`is_active\` = c.\`id\` = dup.keep_id
    `);

    const collectionSortOrders: Array<[string, string, number]> = [
      ['clay', '/products?attrs=clay_type:junni', 1],
      ['clay', '/products?attrs=clay_type:danji', 2],
      ['clay', '/products?attrs=clay_type:jani', 3],
      ['clay', '/products?attrs=clay_type:heugni', 4],
      ['clay', '/products?attrs=clay_type:qingshuini', 5],
      ['clay', '/products?attrs=clay_type:qinghuini', 6],
      ['clay', '/products?attrs=clay_type:nokni', 7],
      ['shape', '/products?attrs=teapot_shape:seoshi', 1],
      ['shape', '/products?attrs=teapot_shape:juhu', 2],
      ['shape', '/products?attrs=teapot_shape:seokpyo', 3],
      ['shape', '/products?attrs=teapot_shape:inwang', 4],
      ['shape', '/products?attrs=teapot_shape:deokjong', 5],
      ['shape', '/products?attrs=teapot_shape:bianping', 6],
      ['shape', '/products?attrs=teapot_shape:supeong', 7],
    ];

    for (const [type, productUrl, sortOrder] of collectionSortOrders) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`sort_order\` = ? WHERE \`type\` = ? AND \`product_url\` = ?`,
        [sortOrder, type, productUrl],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`collections\`
      SET \`is_active\` = TRUE
      WHERE \`type\` IN ('clay', 'shape')
        AND \`product_url\` LIKE '/products?attrs=%'
    `);
  }
}
