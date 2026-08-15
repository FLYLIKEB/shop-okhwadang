import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointHistoryRemainingAmount1787300000000 implements MigrationInterface {
  name = 'AddPointHistoryRemainingAmount1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SET @remaining_amount_exists := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'point_history'
          AND column_name = 'remaining_amount'
      )
    `);
    await queryRunner.query(`
      SET @add_remaining_amount_sql := IF(
        @remaining_amount_exists = 0,
        'ALTER TABLE point_history ADD COLUMN remaining_amount int NULL AFTER amount',
        'SELECT 1'
      )
    `);
    await queryRunner.query('PREPARE add_remaining_amount_statement FROM @add_remaining_amount_sql');
    await queryRunner.query('EXECUTE add_remaining_amount_statement');
    await queryRunner.query('DEALLOCATE PREPARE add_remaining_amount_statement');

    await queryRunner.query('DROP PROCEDURE IF EXISTS `backfill_point_history_remaining_amount`');
    await queryRunner.query(`
      CREATE PROCEDURE \`backfill_point_history_remaining_amount\`()
      BEGIN
        DECLARE done BOOLEAN DEFAULT FALSE;
        DECLARE history_id BIGINT;
        DECLARE history_user_id BIGINT;
        DECLARE history_type VARCHAR(32);
        DECLARE history_amount INT;
        DECLARE history_related_id BIGINT;
        DECLARE history_created_at DATETIME;
        DECLARE lot_id BIGINT;
        DECLARE lot_remaining INT;
        DECLARE remaining_to_allocate INT;
        DECLARE lot_missing BOOLEAN DEFAULT FALSE;
        DECLARE running_balance INT DEFAULT 0;
        DECLARE balance_user_id BIGINT DEFAULT NULL;
        DECLARE balance_history_id BIGINT;
        DECLARE balance_amount INT;
        DECLARE diagnostic_message TEXT;
        DECLARE history_cursor CURSOR FOR
          SELECT id, user_id, type, amount, related_entity_id, created_at
          FROM point_history
          ORDER BY user_id ASC, created_at ASC, id ASC;
        DECLARE balance_cursor CURSOR FOR
          SELECT id, user_id, amount
          FROM point_history
          ORDER BY user_id ASC, created_at ASC, id ASC;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
          ROLLBACK;
          RESIGNAL;
        END;

        START TRANSACTION;
        UPDATE point_history
        SET remaining_amount = CASE
          WHEN type IN ('earn', 'admin_adjust') AND amount > 0 THEN amount
          ELSE NULL
        END;

        OPEN history_cursor;
        history_loop: LOOP
          FETCH history_cursor INTO history_id, history_user_id, history_type, history_amount,
            history_related_id, history_created_at;
          IF done THEN
            LEAVE history_loop;
          END IF;

          IF history_type = 'expire' AND history_related_id IS NOT NULL AND history_amount <> 0 THEN
            SET lot_missing = FALSE;
            BEGIN
              DECLARE CONTINUE HANDLER FOR NOT FOUND SET lot_missing = TRUE;
              SELECT remaining_amount INTO lot_remaining
              FROM point_history
              WHERE id = history_related_id
                AND user_id = history_user_id
                AND remaining_amount IS NOT NULL;
            END;
            IF lot_missing OR lot_remaining < ABS(history_amount) THEN
              SET diagnostic_message = CONCAT(
                'Unallocatable point history: user_id=', history_user_id,
                ', history_id=', history_id
              );
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = diagnostic_message;
            END IF;
            UPDATE point_history
            SET remaining_amount = remaining_amount - ABS(history_amount)
            WHERE id = history_related_id
              AND user_id = history_user_id
              AND remaining_amount IS NOT NULL;
          ELSEIF history_amount < 0 AND history_type IN ('spend', 'admin_adjust') THEN
            SET remaining_to_allocate = ABS(history_amount);
            debit_loop: LOOP
              SET lot_missing = FALSE;
              BEGIN
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET lot_missing = TRUE;
                SELECT id, remaining_amount INTO lot_id, lot_remaining
                FROM point_history
                WHERE user_id = history_user_id
                  AND type IN ('earn', 'admin_adjust')
                  AND amount > 0
                  AND remaining_amount > 0
                  AND (expires_at IS NULL OR expires_at > history_created_at)
                  AND (created_at < history_created_at OR (created_at = history_created_at AND id < history_id))
                ORDER BY expires_at IS NULL ASC, expires_at ASC, created_at ASC, id ASC
                LIMIT 1;
              END;
              IF remaining_to_allocate = 0 THEN
                LEAVE debit_loop;
              END IF;
              IF lot_missing THEN
                SET diagnostic_message = CONCAT(
                  'Unallocatable point history: user_id=', history_user_id,
                  ', history_id=', history_id
                );
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = diagnostic_message;
              END IF;
              SET @consumed := LEAST(lot_remaining, remaining_to_allocate);
              UPDATE point_history
              SET remaining_amount = remaining_amount - @consumed
              WHERE id = lot_id;
              SET remaining_to_allocate = remaining_to_allocate - @consumed;
            END LOOP;
          END IF;
        END LOOP;
        CLOSE history_cursor;

        SET done = FALSE;
        OPEN balance_cursor;
        balance_loop: LOOP
          FETCH balance_cursor INTO balance_history_id, history_user_id, balance_amount;
          IF done THEN
            LEAVE balance_loop;
          END IF;
          IF balance_user_id IS NULL OR balance_user_id <> history_user_id THEN
            SET balance_user_id = history_user_id;
            SET running_balance = 0;
          END IF;
          SET running_balance = running_balance + balance_amount;
          IF running_balance < 0 THEN
            SET diagnostic_message = CONCAT(
              'Impossible point ledger balance: user_id=', history_user_id,
              ', history_id=', balance_history_id
            );
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = diagnostic_message;
          END IF;
          UPDATE point_history
          SET balance = running_balance
          WHERE id = balance_history_id;
        END LOOP;
        CLOSE balance_cursor;
        COMMIT;
      END
    `);
    await queryRunner.query('CALL `backfill_point_history_remaining_amount`()');
    await queryRunner.query('DROP PROCEDURE `backfill_point_history_remaining_amount`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP PROCEDURE IF EXISTS `backfill_point_history_remaining_amount`');
    await queryRunner.query(`
      SET @remaining_amount_exists := (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'point_history'
          AND column_name = 'remaining_amount'
      )
    `);
    await queryRunner.query(`
      SET @drop_remaining_amount_sql := IF(
        @remaining_amount_exists = 1,
        'ALTER TABLE point_history DROP COLUMN remaining_amount',
        'SELECT 1'
      )
    `);
    await queryRunner.query('PREPARE drop_remaining_amount_statement FROM @drop_remaining_amount_sql');
    await queryRunner.query('EXECUTE drop_remaining_amount_statement');
    await queryRunner.query('DEALLOCATE PREPARE drop_remaining_amount_statement');
  }
}
