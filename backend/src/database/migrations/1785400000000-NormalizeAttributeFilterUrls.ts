import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeAttributeFilterUrls1785400000000 implements MigrationInterface {
  name = 'NormalizeAttributeFilterUrls1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const collectionUrls: Array<[string, string, string]> = [
      ['clay', '주니', '/products?attrs=clay_type:junni'],
      ['clay', '단니', '/products?attrs=clay_type:danji'],
      ['clay', '자사', '/products?attrs=clay_type:jani'],
      ['clay', '자니', '/products?attrs=clay_type:jani'],
      ['clay', '흑니', '/products?attrs=clay_type:heugni'],
      ['clay', '청수니', '/products?attrs=clay_type:cheongsu'],
      ['clay', '청회니', '/products?attrs=clay_type:qinghuini'],
      ['clay', '녹니', '/products?attrs=clay_type:nokni'],
      ['shape', '서시', '/products?attrs=teapot_shape:seoshi'],
      ['shape', '주형', '/products?attrs=teapot_shape:juhu'],
      ['shape', '석표', '/products?attrs=teapot_shape:seokpyo'],
      ['shape', '인왕', '/products?attrs=teapot_shape:inwang'],
      ['shape', '덕종', '/products?attrs=teapot_shape:deokjong'],
      ['shape', '편평', '/products?attrs=teapot_shape:bianping'],
      ['shape', '수평', '/products?attrs=teapot_shape:supeong'],
    ];

    for (const [type, nameKo, productUrl] of collectionUrls) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`product_url\` = ? WHERE \`type\` = ? AND \`nameKo\` = ?`,
        [productUrl, type, nameKo],
      );
    }

    const niloUrls: Array<[string, string]> = [
      ['주니', '/products?attrs=clay_type:junni'],
      ['자사', '/products?attrs=clay_type:jani'],
      ['단니', '/products?attrs=clay_type:danji'],
      ['흑니', '/products?attrs=clay_type:heugni'],
      ['청회니', '/products?attrs=clay_type:qinghuini'],
    ];

    for (const [nameKo, productUrl] of niloUrls) {
      await queryRunner.query(
        `UPDATE \`nilo_types\` SET \`product_url\` = ? WHERE \`nameKo\` = ?`,
        [productUrl, nameKo],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const legacyCollectionUrls: Array<[string, string, string]> = [
      ['clay', '주니', '/products?categoryId=10'],
      ['clay', '자사', '/products?categoryId=11'],
      ['clay', '단니', '/products?categoryId=12'],
      ['clay', '청회니', '/products?categoryId=14'],
      ['shape', '주형', '/products?categoryId=20'],
      ['shape', '석표', '/products?categoryId=21'],
      ['shape', '서시', '/products?categoryId=22'],
      ['shape', '편평', '/products?categoryId=23'],
    ];

    for (const [type, nameKo, productUrl] of legacyCollectionUrls) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`product_url\` = ? WHERE \`type\` = ? AND \`nameKo\` = ?`,
        [productUrl, type, nameKo],
      );
    }

    const legacyNiloUrls: Array<[string, string]> = [
      ['주니', '/products?categoryId=10'],
      ['자사', '/products?categoryId=11'],
      ['단니', '/products?categoryId=12'],
      ['흑니', '/products?categoryId=13'],
      ['청회니', '/products?categoryId=14'],
    ];

    for (const [nameKo, productUrl] of legacyNiloUrls) {
      await queryRunner.query(
        `UPDATE \`nilo_types\` SET \`product_url\` = ? WHERE \`nameKo\` = ?`,
        [productUrl, nameKo],
      );
    }
  }
}
