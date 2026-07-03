import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeywordMappingAttributeTypes1785300000000 implements MigrationInterface {
  name = 'AddKeywordMappingAttributeTypes1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`attribute_types\` (\`code\`, \`name\`, \`name_ko\`, \`input_type\`, \`is_filterable\`, \`is_searchable\`, \`valid_values\`, \`sort_order\`, \`is_active\`)
      VALUES
        ('capacity', 'Capacity', '용량', 'text', TRUE, FALSE, NULL, 3, TRUE),
        ('craft_method', 'Craft Method', '제작방식', 'select', TRUE, FALSE, '["handmade"]', 4, TRUE),
        ('clay_origin', 'Clay Origin', '니료 산지', 'select', TRUE, FALSE, '["huanglongshan"]', 5, TRUE)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`name_ko\` = VALUES(\`name_ko\`),
        \`input_type\` = VALUES(\`input_type\`),
        \`is_filterable\` = VALUES(\`is_filterable\`),
        \`is_searchable\` = VALUES(\`is_searchable\`),
        \`valid_values\` = VALUES(\`valid_values\`),
        \`sort_order\` = VALUES(\`sort_order\`),
        \`is_active\` = TRUE
    `);

    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["junni","danji","jani","heugni","cheongsu","nokni","hongwei_zhuni","benshan_luni","old_qingshuini","old_duanni","tiechengzao_hongni","old_zini","dicaoqing","qinghuini","qingshuini","jiangponi","yubaini","duanni","zhuni","hongni","zini","heini","luni","wuni"]'
      WHERE \`code\` = 'clay_type'
    `);

    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["seoshi","seokpyo","juhu","bianping","inwang","deokjong","supeong","pinggai_lianzi","lianzi","xishi","shipiao","fanggu","shuiping","longdan","banyue","xubian","hanwa","tieqiu","banhu","julunzhu","yixing"]'
      WHERE \`code\` = 'teapot_shape'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`attribute_types\` WHERE \`code\` IN ('capacity', 'craft_method', 'clay_origin')`);
    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["junni","danji","jani","heugni","cheongsu","nokni"]'
      WHERE \`code\` = 'clay_type'
    `);
    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["seoshi","seokpyo","juhu","bianping","inwang","deokjong","supeong"]'
      WHERE \`code\` = 'teapot_shape'
    `);
  }
}
