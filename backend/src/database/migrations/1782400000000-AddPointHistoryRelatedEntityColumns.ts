import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointHistoryRelatedEntityColumns1782400000000 implements MigrationInterface {
  name = 'AddPointHistoryRelatedEntityColumns1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`point_history\`
       ADD \`related_entity_type\` enum ('review', 'order', 'coupon', 'shipping', 'membership') NULL AFTER \`order_id\`,
       ADD \`related_entity_id\` bigint NULL AFTER \`related_entity_type\``,
    );

    await queryRunner.query(
      `CREATE INDEX \`IDX_point_history_related_entity\` ON \`point_history\` (\`related_entity_type\`, \`related_entity_id\`)`,
    );

    await queryRunner.query(
      `UPDATE \`point_history\`
       SET
         \`related_entity_type\` = 'review',
         \`related_entity_id\` = CAST(
           SUBSTRING_INDEX(
             SUBSTRING_INDEX(\`description\`, 'review_id:', -1),
             ')',
             1
           ) AS UNSIGNED
         )
       WHERE \`description\` REGEXP 'review_id:[0-9]+'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_point_history_related_entity\` ON \`point_history\``);
    await queryRunner.query(
      `ALTER TABLE \`point_history\`
       DROP COLUMN \`related_entity_id\`,
       DROP COLUMN \`related_entity_type\``,
    );
  }
}
