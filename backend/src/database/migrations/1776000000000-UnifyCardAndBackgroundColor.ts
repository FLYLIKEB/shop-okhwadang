import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyCardAndBackgroundColor1776000000000 implements MigrationInterface {
  name = 'UnifyCardAndBackgroundColor1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // color_card를 color_background와 동일하게 통일 (#FDFCF9)
    // 푸터(bg-card)와 페이지 배경(bg-background)이 같은 색으로 렌더됨
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_card', '#FDFCF9', 'color', '카드 배경색', 'color', '#FDFCF9', 13),
        ('color_card_foreground', '#111111', 'color', '카드 텍스트색', 'color', '#111111', 14)
      ON DUPLICATE KEY UPDATE
        \`value\` = VALUES(\`value\`),
        \`default_value\` = VALUES(\`default_value\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`site_settings\` SET \`value\` = '#FFFFFF', \`default_value\` = '#FFFFFF'
      WHERE \`setting_key\` = 'color_card'
    `);
  }
}
