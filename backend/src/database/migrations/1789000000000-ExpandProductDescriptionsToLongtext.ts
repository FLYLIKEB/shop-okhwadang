import { MigrationInterface, QueryRunner } from 'typeorm';

const DESCRIPTION_COLUMNS = ['description', 'description_en', 'description_ja', 'description_zh'];

export class ExpandProductDescriptionsToLongtext1789000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`products\` ${DESCRIPTION_COLUMNS
      .map((column) => `MODIFY COLUMN \`${column}\` LONGTEXT NULL`)
      .join(', ')}`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const oversized: { id: number | string }[] = await queryRunner.query(
      `SELECT \`id\` FROM \`products\` WHERE ${DESCRIPTION_COLUMNS
        .map((column) => `OCTET_LENGTH(\`${column}\`) > 65535`)
        .join(' OR ')} LIMIT 1`,
    );
    if (oversized.length > 0) {
      throw new Error('상품 설명이 TEXT의 65535바이트 한도를 초과하여 롤백할 수 없습니다.');
    }

    const [{ sqlMode }]: { sqlMode: string }[] = await queryRunner.query('SELECT @@SESSION.sql_mode AS sqlMode');
    // A concurrent write after the guard must fail the ALTER, never silently truncate.
    const strictMode = [...new Set([...sqlMode.split(',').filter(Boolean), 'STRICT_ALL_TABLES'])].join(',');
    await queryRunner.query('SET SESSION sql_mode = ?', [strictMode]);
    try {
      await queryRunner.query(`ALTER TABLE \`products\` ${DESCRIPTION_COLUMNS
        .map((column) => `MODIFY COLUMN \`${column}\` TEXT NULL`)
        .join(', ')}`);
    } finally {
      await queryRunner.query('SET SESSION sql_mode = ?', [sqlMode]);
    }
  }
}
