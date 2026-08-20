import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointHistoryRemainingAmount1785500000000 implements MigrationInterface {
  name = 'AddPointHistoryRemainingAmount1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`SHOW COLUMNS FROM \`point_history\` LIKE 'remaining_amount'`) as unknown[];
    if (columns.length === 0) {
      await queryRunner.query(`ALTER TABLE \`point_history\` ADD \`remaining_amount\` int NULL AFTER \`amount\``);
    }
    const users = await queryRunner.query(`SELECT DISTINCT user_id FROM \`point_history\``) as Array<{ user_id: number }>;
    for (const { user_id } of users) {
      const rows = await queryRunner.query(
        `SELECT id, type, amount FROM \`point_history\` WHERE user_id = ? ORDER BY created_at ASC, id ASC`,
        [user_id],
      ) as Array<{ id: number; type: string; amount: number }>;
      const lots: Array<{ id: number; remaining: number }> = [];
      for (const row of rows) {
        if (row.type === 'earn' && row.amount > 0) {
          lots.push({ id: row.id, remaining: row.amount });
          continue;
        }
        let debit = row.amount < 0 ? -row.amount : 0;
        for (const lot of lots) {
          const used = Math.min(lot.remaining, debit);
          lot.remaining -= used;
          debit -= used;
          if (debit === 0) break;
        }
      }
      for (const lot of lots) {
        await queryRunner.query(`UPDATE \`point_history\` SET \`remaining_amount\` = ? WHERE id = ?`, [lot.remaining, lot.id]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`point_history\` DROP COLUMN \`remaining_amount\``);
  }
}
