import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestCheckoutSchema1786600000000 implements MigrationInterface {
  name = 'AddGuestCheckoutSchema1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'orders', 'guest_email_normalized'))) {
      await queryRunner.query(
        "ALTER TABLE `orders` ADD COLUMN `guest_email_normalized` varchar(255) NULL AFTER `user_id`",
      );
    }

    if (!(await this.columnExists(queryRunner, 'orders', 'order_locale'))) {
      await queryRunner.query(
        "ALTER TABLE `orders` ADD COLUMN `order_locale` enum('ko', 'en') NULL AFTER `order_number`",
      );
    }

    await queryRunner.query("UPDATE `orders` SET `order_locale` = 'ko' WHERE `order_locale` IS NULL");

    if (await this.foreignKeyExists(queryRunner, 'orders', 'FK_a922b820eeef29ac1c6800e826a')) {
      await queryRunner.query(
        'ALTER TABLE `orders` DROP FOREIGN KEY `FK_a922b820eeef29ac1c6800e826a`',
      );
    }

    await queryRunner.query('ALTER TABLE `orders` MODIFY COLUMN `user_id` bigint NULL');

    if (!(await this.indexExists(queryRunner, 'orders', 'IDX_a922b820eeef29ac1c6800e826'))) {
      await queryRunner.query('CREATE INDEX `IDX_a922b820eeef29ac1c6800e826` ON `orders` (`user_id`)');
    }

    if (!(await this.foreignKeyExists(queryRunner, 'orders', 'FK_a922b820eeef29ac1c6800e826a'))) {
      await queryRunner.query(
        'ALTER TABLE `orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
      );
    }

    if (await this.foreignKeyExists(queryRunner, 'policy_consents', 'FK_policy_consents_user')) {
      await queryRunner.query(
        'ALTER TABLE `policy_consents` DROP FOREIGN KEY `FK_policy_consents_user`',
      );
    }

    await queryRunner.query('ALTER TABLE `policy_consents` MODIFY COLUMN `user_id` bigint NULL');

    if (!(await this.indexExists(queryRunner, 'policy_consents', 'IDX_policy_consents_user'))) {
      await queryRunner.query(
        'CREATE INDEX `IDX_policy_consents_user` ON `policy_consents` (`user_id`)',
      );
    }

    if (!(await this.foreignKeyExists(queryRunner, 'policy_consents', 'FK_policy_consents_user'))) {
      await queryRunner.query(
        'ALTER TABLE `policy_consents` ADD CONSTRAINT `FK_policy_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }

    if (!(await this.tableExists(queryRunner, 'guest_order_access'))) {
      await queryRunner.query(
        'CREATE TABLE `guest_order_access` (`id` bigint NOT NULL AUTO_INCREMENT, `order_id` bigint NOT NULL, `token_digest` varchar(64) NOT NULL, `expires_at` datetime NOT NULL, `superseded_at` datetime NULL, `superseded_by_id` bigint NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_guest_order_access_order_id` (`order_id`), UNIQUE INDEX `IDX_guest_order_access_token_digest` (`token_digest`), INDEX `IDX_guest_order_access_expires_at` (`expires_at`), INDEX `IDX_guest_order_access_superseded_by_id` (`superseded_by_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
      );
      await queryRunner.query(
        'ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
      await queryRunner.query(
        'ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_superseded_by_id` FOREIGN KEY (`superseded_by_id`) REFERENCES `guest_order_access`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
      );
    }

    await queryRunner.query("ALTER TABLE `orders` MODIFY COLUMN `order_locale` enum('ko', 'en') NOT NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'guest_order_access')) {
      if (await this.foreignKeyExists(queryRunner, 'guest_order_access', 'FK_guest_order_access_superseded_by_id')) {
        await queryRunner.query(
          'ALTER TABLE `guest_order_access` DROP FOREIGN KEY `FK_guest_order_access_superseded_by_id`',
        );
      }
      if (await this.foreignKeyExists(queryRunner, 'guest_order_access', 'FK_guest_order_access_order_id')) {
        await queryRunner.query(
          'ALTER TABLE `guest_order_access` DROP FOREIGN KEY `FK_guest_order_access_order_id`',
        );
      }
      await queryRunner.query('DROP TABLE `guest_order_access`');
    }

    await this.ensureRollbackSafe(queryRunner, 'policy_consents', '`user_id` IS NULL', 'policy_consents.user_id');
    if (await this.foreignKeyExists(queryRunner, 'policy_consents', 'FK_policy_consents_user')) {
      await queryRunner.query(
        'ALTER TABLE `policy_consents` DROP FOREIGN KEY `FK_policy_consents_user`',
      );
    }
    await queryRunner.query('ALTER TABLE `policy_consents` MODIFY COLUMN `user_id` bigint NOT NULL');
    if (!(await this.foreignKeyExists(queryRunner, 'policy_consents', 'FK_policy_consents_user'))) {
      await queryRunner.query(
        'ALTER TABLE `policy_consents` ADD CONSTRAINT `FK_policy_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }

    await this.ensureRollbackSafe(queryRunner, 'orders', '`user_id` IS NULL', 'orders.user_id');
    if (await this.foreignKeyExists(queryRunner, 'orders', 'FK_a922b820eeef29ac1c6800e826a')) {
      await queryRunner.query(
        'ALTER TABLE `orders` DROP FOREIGN KEY `FK_a922b820eeef29ac1c6800e826a`',
      );
    }
    await queryRunner.query('ALTER TABLE `orders` MODIFY COLUMN `user_id` bigint NOT NULL');
    if (!(await this.foreignKeyExists(queryRunner, 'orders', 'FK_a922b820eeef29ac1c6800e826a'))) {
      await queryRunner.query(
        'ALTER TABLE `orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
      );
    }

    if (await this.columnExists(queryRunner, 'orders', 'order_locale')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `order_locale`');
    }
    if (await this.columnExists(queryRunner, 'orders', 'guest_email_normalized')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `guest_email_normalized`');
    }
  }

  private async ensureRollbackSafe(
    queryRunner: QueryRunner,
    tableName: string,
    predicate: string,
    label: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE ${predicate}`,
    )) as Array<{ cnt: string }>;
    if (Number(rows[0]?.cnt ?? 0) > 0) {
      throw new Error(`Cannot rollback guest checkout schema while ${label} contains NULL rows.`);
    }
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [tableName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [tableName, columnName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  private async indexExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
      [tableName, indexName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  private async foreignKeyExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = \'FOREIGN KEY\'',
      [tableName, constraintName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }
}
