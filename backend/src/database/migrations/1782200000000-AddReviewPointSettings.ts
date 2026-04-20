import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewPointSettings1782200000000 implements MigrationInterface {
  name = 'AddReviewPointSettings1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('review_point_reward', '100', 'review', '리뷰 작성 포인트', 'number', NULL, '100', 200),
        ('photo_review_bonus', '0', 'review', '포토 리뷰 추가 보상', 'number', NULL, '0', 201)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\` WHERE \`setting_key\` IN ('review_point_reward', 'photo_review_bonus')
    `);
  }
}
