import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetireLegacyCollectionsTable1786000000000 implements MigrationInterface {
  name = 'RetireLegacyCollectionsTable1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The deployment DB user intentionally has no DROP privilege. Runtime code no
    // longer reads `collections`; clear the legacy rows so this table cannot keep
    // acting as a second catalog/CMS source of truth.
    if (await queryRunner.hasTable('collections')) {
      await queryRunner.query('DELETE FROM `collections`');
    }
  }

  public async down(): Promise<void> {
    // Legacy collection content is now represented by CMS page blocks and
    // attribute filter values. Do not recreate rows from this retired source.
  }
}
