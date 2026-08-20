import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillJournalSlugs1788000000000 implements MigrationInterface {
  name = 'BackfillJournalSlugs1788000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `journal_entries` SET `slug` = CONCAT('journal-', `id`) WHERE TRIM(`slug`) = ''",
    );
  }

  async down(): Promise<void> {
    // The original empty slugs cannot be restored without reintroducing broken links.
  }
}
