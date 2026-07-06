import { MigrationInterface, QueryRunner } from 'typeorm';

const ATTRIBUTE_DISPLAY_LABELS: Array<[string, string, string]> = [
  ['clay_type', 'junni', '주니'],
  ['clay_type', 'danji', '단니'],
  ['clay_type', 'jani', '자니'],
  ['clay_type', 'heugni', '흑니'],
  ['clay_type', 'qinghuini', '청회니'],
  ['clay_type', 'qingshuini', '청수니'],
  ['clay_type', 'nokni', '녹니'],
  ['clay_type', 'hongwei_zhuni', '홍위주니'],
  ['clay_type', 'benshan_luni', '본산녹니'],
  ['clay_type', 'old_qingshuini', '노청수니'],
  ['clay_type', 'old_duanni', '노단니'],
  ['clay_type', 'tiechengzao_hongni', '철성조홍니'],
  ['clay_type', 'old_zini', '노자니'],
  ['clay_type', 'dicaoqing', '저조청'],
  ['clay_type', 'jiangponi', '강파니'],
  ['clay_type', 'yubaini', '옥백니'],
  ['clay_type', 'hongni', '홍니'],
  ['clay_type', 'wuni', '오니'],
  ['teapot_shape', 'seoshi', '서시'],
  ['teapot_shape', 'seokpyo', '석표'],
  ['teapot_shape', 'juhu', '주형'],
  ['teapot_shape', 'bianping', '편평'],
  ['teapot_shape', 'inwang', '인왕'],
  ['teapot_shape', 'deokjong', '덕종'],
  ['teapot_shape', 'supeong', '수평'],
  ['teapot_shape', 'pinggai_lianzi', '평개연자호'],
  ['teapot_shape', 'lianzi', '연자호'],
  ['teapot_shape', 'fanggu', '방고호'],
  ['teapot_shape', 'longdan', '용단'],
  ['teapot_shape', 'banyue', '반월'],
  ['teapot_shape', 'xubian', '허편'],
  ['teapot_shape', 'hanwa', '한와호'],
  ['teapot_shape', 'tieqiu', '철구호'],
  ['teapot_shape', 'banhu', '반호'],
  ['teapot_shape', 'julunzhu', '거륜주'],
  ['teapot_shape', 'yixing', '이형호'],
];

export class NormalizeAttributeDisplayLabels1786100000000 implements MigrationInterface {
  name = 'NormalizeAttributeDisplayLabels1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [typeCode, value, displayValue] of ATTRIBUTE_DISPLAY_LABELS) {
      await queryRunner.query(
        `UPDATE product_attributes pa
         INNER JOIN attribute_types at ON at.id = pa.attribute_type_id
         SET pa.display_value = ?
         WHERE at.code = ? AND pa.value = ?`,
        [displayValue, typeCode, value],
      );
    }

    await queryRunner.query(
      `UPDATE attribute_types SET nameKo = '니료' WHERE code = 'clay_type'`,
    );

    if (await queryRunner.hasTable('page_blocks')) {
      await queryRunner.query(
        `UPDATE page_blocks
         SET content = REPLACE(REPLACE(content, '니료(泥料)', '니료'), '자사니로', '자사니료')
         WHERE content LIKE '%니료(泥料)%' OR content LIKE '%자사니로%'`,
      );
    }
  }

  public async down(): Promise<void> {
    // Do not restore mixed English/null display labels or typo text.
  }
}
