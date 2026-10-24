import { MigrationInterface, QueryRunner } from 'typeorm';
import blocks from './data/archive-copy-1789100000000.json';

const BACKUP_TABLE = 'archive_copy_backup_1789100000000';

export class ReviseArchiveKoreanCopy1789100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
      block_id bigint NOT NULL PRIMARY KEY, page_id bigint NOT NULL, sort_order int NOT NULL,
      original_type varchar(50) NOT NULL, replacement_type varchar(50) NOT NULL,
      original_content json NOT NULL, replacement_content json NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    for (const block of blocks) {
      await queryRunner.query(
        `INSERT IGNORE INTO ${BACKUP_TABLE}
          (block_id, page_id, sort_order, original_type, replacement_type, original_content, replacement_content)
         SELECT b.id, b.page_id, b.sort_order, b.type, ?, b.content, CAST(? AS JSON)
           FROM page_blocks b JOIN pages p ON p.id = b.page_id
          WHERE p.slug = 'archive' AND b.sort_order = ? AND b.type IN (?, ?)`,
        [block.type, JSON.stringify(block.content), block.sortOrder, block.previousType, block.type],
      );
    }

    await queryRunner.query(`UPDATE page_blocks b
      JOIN pages p ON p.id = b.page_id
      JOIN ${BACKUP_TABLE} backup ON backup.block_id = b.id AND backup.page_id = b.page_id
      SET b.type = backup.replacement_type, b.content = backup.replacement_content
      WHERE p.slug = 'archive' AND b.sort_order = backup.sort_order
        AND BINARY b.type = BINARY backup.original_type AND b.content = backup.original_content`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE page_blocks b
      JOIN pages p ON p.id = b.page_id
      JOIN ${BACKUP_TABLE} backup ON backup.block_id = b.id AND backup.page_id = b.page_id
      SET b.type = backup.original_type, b.content = backup.original_content
      WHERE p.slug = 'archive' AND b.sort_order = backup.sort_order
        AND BINARY b.type = BINARY backup.replacement_type AND b.content = backup.replacement_content`);
  }
}
