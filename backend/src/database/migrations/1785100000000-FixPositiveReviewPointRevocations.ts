import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPositiveReviewPointRevocations1785100000000 implements MigrationInterface {
  name = 'FixPositiveReviewPointRevocations1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`point_history\`
       SET \`amount\` = -ABS(\`amount\`)
       WHERE \`type\` = 'spend'
         AND \`amount\` > 0
         AND \`related_entity_type\` = 'review'
         AND \`description\` LIKE '리뷰 포인트 환수%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`point_history\`
       SET \`amount\` = ABS(\`amount\`)
       WHERE \`type\` = 'spend'
         AND \`amount\` < 0
         AND \`related_entity_type\` = 'review'
         AND \`description\` LIKE '리뷰 포인트 환수%'`,
    );
  }
}
