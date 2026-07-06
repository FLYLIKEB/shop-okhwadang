import { MigrationInterface, QueryRunner } from 'typeorm';

const VALUE_LABELS: Record<string, Array<[string, string, number]>> = {
  clay_type: [
    ['junni', '주니', 1],
    ['danji', '단니', 2],
    ['jani', '자니', 3],
    ['heugni', '흑니', 4],
    ['qinghuini', '청회니', 5],
    ['qingshuini', '청수니', 6],
    ['nokni', '녹니', 7],
    ['hongwei_zhuni', '홍위주니', 8],
    ['benshan_luni', '본산녹니', 9],
    ['old_qingshuini', '노청수니', 10],
    ['old_duanni', '노단니', 11],
    ['tiechengzao_hongni', '철성조홍니', 12],
    ['old_zini', '노자니', 13],
    ['dicaoqing', '저조청', 14],
    ['jiangponi', '강파니', 15],
    ['yubaini', '옥백니', 16],
    ['hongni', '홍니', 17],
    ['wuni', '오니', 18],
  ],
  teapot_shape: [
    ['seoshi', '서시', 1],
    ['seokpyo', '석표', 2],
    ['juhu', '주형', 3],
    ['bianping', '편평', 4],
    ['inwang', '인왕', 5],
    ['deokjong', '덕종', 6],
    ['supeong', '수평', 7],
    ['pinggai_lianzi', '평개연자호', 8],
    ['lianzi', '연자호', 9],
    ['fanggu', '방고호', 10],
    ['longdan', '용단', 11],
    ['banyue', '반월', 12],
    ['xubian', '허편', 13],
    ['hanwa', '한와호', 14],
    ['tieqiu', '철구호', 15],
    ['banhu', '반호', 16],
    ['julunzhu', '거륜주', 17],
    ['yixing', '이형호', 18],
  ],
};

export class AddAttributeValueOptions1786300000000 implements MigrationInterface {
  name = 'AddAttributeValueOptions1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`attribute_value_options\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`attribute_type_id\` int NOT NULL,
        \`value\` varchar(255) NOT NULL,
        \`display_value\` varchar(255) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_attribute_value_options_type_value\` (\`attribute_type_id\`, \`value\`),
        INDEX \`IDX_attribute_value_options_type_sort\` (\`attribute_type_id\`, \`sort_order\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_attribute_value_options_type\` FOREIGN KEY (\`attribute_type_id\`) REFERENCES \`attribute_types\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const [typeCode, labels] of Object.entries(VALUE_LABELS)) {
      for (const [value, displayValue, sortOrder] of labels) {
        await queryRunner.query(
          `INSERT INTO \`attribute_value_options\` (\`attribute_type_id\`, \`value\`, \`display_value\`, \`sort_order\`, \`is_active\`)
           SELECT at.\`id\`, ?, ?, ?, 1
           FROM \`attribute_types\` at
           WHERE at.\`code\` = ?
           ON DUPLICATE KEY UPDATE
             \`display_value\` = VALUES(\`display_value\`),
             \`sort_order\` = VALUES(\`sort_order\`),
             \`is_active\` = 1`,
          [value, displayValue, sortOrder, typeCode],
        );
      }
    }

    await queryRunner.query(`
      INSERT INTO \`attribute_value_options\` (\`attribute_type_id\`, \`value\`, \`display_value\`, \`sort_order\`, \`is_active\`)
      SELECT pa.\`attribute_type_id\`, pa.\`value\`, COALESCE(NULLIF(pa.\`display_value\`, ''), pa.\`value\`), 999, 1
      FROM \`product_attributes\` pa
      GROUP BY pa.\`attribute_type_id\`, pa.\`value\`, COALESCE(NULLIF(pa.\`display_value\`, ''), pa.\`value\`)
      ON DUPLICATE KEY UPDATE
        \`display_value\` = IF(\`attribute_value_options\`.\`display_value\` = \`attribute_value_options\`.\`value\`, VALUES(\`display_value\`), \`attribute_value_options\`.\`display_value\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `attribute_value_options`');
  }
}
