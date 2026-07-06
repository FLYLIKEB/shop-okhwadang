import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeduplicateAttributeValueOptions1785800000000 implements MigrationInterface {
  name = 'DeduplicateAttributeValueOptions1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'clay_type'
      SET pa.value = CASE pa.value
        WHEN 'cheongsu' THEN 'qinghuini'
        WHEN 'zhuni' THEN 'junni'
        WHEN 'duanni' THEN 'danji'
        WHEN 'zini' THEN 'jani'
        WHEN 'heini' THEN 'heugni'
        WHEN 'luni' THEN 'nokni'
        ELSE pa.value
      END,
      pa.display_value = CASE pa.value
        WHEN 'cheongsu' THEN '청회니'
        WHEN 'zhuni' THEN '주니'
        WHEN 'duanni' THEN '단니'
        WHEN 'zini' THEN '자니'
        WHEN 'heini' THEN '흑니'
        WHEN 'luni' THEN '녹니'
        ELSE pa.display_value
      END
      WHERE pa.value IN ('cheongsu', 'zhuni', 'duanni', 'zini', 'heini', 'luni')
    `);

    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'teapot_shape'
      SET pa.value = CASE pa.value
        WHEN 'xishi' THEN 'seoshi'
        WHEN 'shipiao' THEN 'seokpyo'
        WHEN 'shuiping' THEN 'supeong'
        ELSE pa.value
      END,
      pa.display_value = CASE pa.value
        WHEN 'xishi' THEN '서시'
        WHEN 'shipiao' THEN '석표'
        WHEN 'shuiping' THEN '수평'
        ELSE pa.display_value
      END
      WHERE pa.value IN ('xishi', 'shipiao', 'shuiping')
    `);

    const urlReplacements: Array<[string, string]> = [
      ['clay_type:zhuni', 'clay_type:junni'],
      ['clay_type:duanni', 'clay_type:danji'],
      ['clay_type:zini', 'clay_type:jani'],
      ['clay_type:heini', 'clay_type:heugni'],
      ['clay_type:luni', 'clay_type:nokni'],
      ['teapot_shape:xishi', 'teapot_shape:seoshi'],
      ['teapot_shape:shipiao', 'teapot_shape:seokpyo'],
      ['teapot_shape:shuiping', 'teapot_shape:supeong'],
    ];

    await queryRunner.query(`
      UPDATE \`collections\`
      SET \`product_url\` = REPLACE(\`product_url\`, 'clay_type:cheongsu', 'clay_type:qingshuini')
      WHERE \`type\` = 'clay' AND \`nameKo\` = '청수니'
    `);
    await queryRunner.query(`
      UPDATE \`nilo_types\`
      SET \`product_url\` = REPLACE(\`product_url\`, 'clay_type:cheongsu', 'clay_type:qingshuini')
      WHERE \`nameKo\` = '청수니'
    `);

    for (const [fromValue, toValue] of urlReplacements) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`product_url\` = REPLACE(\`product_url\`, ?, ?) WHERE \`product_url\` LIKE ?`,
        [fromValue, toValue, `%${fromValue}%`],
      );
      await queryRunner.query(
        `UPDATE \`nilo_types\` SET \`product_url\` = REPLACE(\`product_url\`, ?, ?) WHERE \`product_url\` LIKE ?`,
        [fromValue, toValue, `%${fromValue}%`],
      );
    }



    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["junni","danji","jani","heugni","qinghuini","qingshuini","nokni","hongwei_zhuni","benshan_luni","old_qingshuini","old_duanni","tiechengzao_hongni","old_zini","dicaoqing","jiangponi","yubaini","hongni","wuni"]'
      WHERE \`code\` = 'clay_type'
    `);

    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["seoshi","seokpyo","juhu","bianping","inwang","deokjong","supeong","pinggai_lianzi","lianzi","fanggu","longdan","banyue","xubian","hanwa","tieqiu","banhu","julunzhu","yixing"]'
      WHERE \`code\` = 'teapot_shape'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
