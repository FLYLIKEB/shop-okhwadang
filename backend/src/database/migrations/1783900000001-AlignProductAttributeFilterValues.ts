import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignProductAttributeFilterValues1783900000001 implements MigrationInterface {
  name = 'AlignProductAttributeFilterValues1783900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'clay_type'
      SET pa.value = CASE pa.value
        WHEN 'zhuni' THEN 'junni'
        WHEN 'zisha' THEN 'jani'
        WHEN 'duanni' THEN 'danji'
        WHEN 'heini' THEN 'heugni'
        WHEN 'qinghuini' THEN 'cheongsu'
        ELSE pa.value
      END
      WHERE pa.value IN ('zhuni', 'zisha', 'duanni', 'heini', 'qinghuini')
    `);
    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'teapot_shape'
      SET pa.value = CASE pa.value
        WHEN 'xishi' THEN 'seoshi'
        WHEN 'shipiao' THEN 'seokpyo'
        WHEN 'zhuxing' THEN 'juhu'
        ELSE pa.value
      END
      WHERE pa.value IN ('xishi', 'shipiao', 'zhuxing')
    `);
    await queryRunner.query(`
      UPDATE \`collections\`
      SET \`product_url\` = CASE
        WHEN \`type\` = 'clay' THEN CONCAT('/products?attrs=clay_type:', \`name\`)
        WHEN \`type\` = 'shape' THEN CONCAT('/products?attrs=teapot_shape:', \`name\`)
        ELSE \`product_url\`
      END
      WHERE (\`type\` = 'clay' AND \`product_url\` LIKE '/products?clayType=%')
         OR (\`type\` = 'shape' AND \`product_url\` LIKE '/products?teapotShape=%')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`collections\`
      SET \`product_url\` = CASE
        WHEN \`type\` = 'clay' THEN CONCAT('/products?clayType=', \`name\`)
        WHEN \`type\` = 'shape' THEN CONCAT('/products?teapotShape=', \`name\`)
        ELSE \`product_url\`
      END
      WHERE (\`type\` = 'clay' AND \`product_url\` LIKE '/products?attrs=clay_type:%')
         OR (\`type\` = 'shape' AND \`product_url\` LIKE '/products?attrs=teapot_shape:%')
    `);
    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'teapot_shape'
      SET pa.value = CASE pa.value
        WHEN 'seoshi' THEN 'xishi'
        WHEN 'seokpyo' THEN 'shipiao'
        WHEN 'juhu' THEN 'zhuxing'
        ELSE pa.value
      END
      WHERE pa.value IN ('seoshi', 'seokpyo', 'juhu')
    `);
    await queryRunner.query(`
      UPDATE \`product_attributes\` pa
      INNER JOIN \`attribute_types\` at ON at.id = pa.attribute_type_id AND at.code = 'clay_type'
      SET pa.value = CASE pa.value
        WHEN 'junni' THEN 'zhuni'
        WHEN 'jani' THEN 'zisha'
        WHEN 'danji' THEN 'duanni'
        WHEN 'heugni' THEN 'heini'
        WHEN 'cheongsu' THEN 'qinghuini'
        ELSE pa.value
      END
      WHERE pa.value IN ('junni', 'jani', 'danji', 'heugni', 'cheongsu')
    `);

    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["zhuni","zisha","duanni","heini","qinghuini"]'
      WHERE \`code\` = 'clay_type'
    `);
    await queryRunner.query(`
      UPDATE \`attribute_types\`
      SET \`valid_values\` = '["zhuxing","shipiao","xishi","bianping"]'
      WHERE \`code\` = 'teapot_shape'
    `);
  }
}
