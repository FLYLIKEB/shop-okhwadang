import { QueryRunner } from 'typeorm';
import { AddGuestCheckoutSchema1786600000000 } from '../migrations/1786600000000-AddGuestCheckoutSchema';

describe('guest checkout migration', () => {
  type SchemaState = {
    tables: Set<string>;
    columns: Set<string>;
    indexes: Set<string>;
    foreignKeys: Set<string>;
  };

  function createQueryRunner() {
    const executed: string[] = [];
    const state: SchemaState = {
      tables: new Set(['orders', 'policy_consents']),
      columns: new Set([
        'orders.id',
        'orders.user_id',
        'orders.order_number',
        'policy_consents.id',
        'policy_consents.user_id',
      ]),
      indexes: new Set(['orders.IDX_a922b820eeef29ac1c6800e826', 'policy_consents.IDX_policy_consents_user']),
      foreignKeys: new Set([
        'orders.FK_a922b820eeef29ac1c6800e826a',
        'policy_consents.FK_policy_consents_user',
      ]),
    };

    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      executed.push(sql);

      if (sql.includes('INFORMATION_SCHEMA.TABLES')) {
        const tableName = String(params?.[0]);
        return [{ cnt: state.tables.has(tableName) ? '1' : '0' }];
      }

      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        const tableName = String(params?.[0]);
        const columnName = String(params?.[1]);
        return [{ cnt: state.columns.has(`${tableName}.${columnName}`) ? '1' : '0' }];
      }

      if (sql.includes('INFORMATION_SCHEMA.STATISTICS')) {
        const tableName = String(params?.[0]);
        const indexName = String(params?.[1]);
        return [{ cnt: state.indexes.has(`${tableName}.${indexName}`) ? '1' : '0' }];
      }

      if (sql.includes('INFORMATION_SCHEMA.TABLE_CONSTRAINTS')) {
        const tableName = String(params?.[0]);
        const constraintName = String(params?.[1]);
        return [{ cnt: state.foreignKeys.has(`${tableName}.${constraintName}`) ? '1' : '0' }];
      }

      if (sql.startsWith('ALTER TABLE `orders` ADD COLUMN `guest_email_normalized`')) {
        state.columns.add('orders.guest_email_normalized');
      }

      if (sql.startsWith('ALTER TABLE `orders` ADD COLUMN `order_locale`')) {
        state.columns.add('orders.order_locale');
      }

      if (sql.startsWith('ALTER TABLE `orders` DROP FOREIGN KEY')) {
        state.foreignKeys.delete('orders.FK_a922b820eeef29ac1c6800e826a');
      }

      if (sql.startsWith('ALTER TABLE `orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a`')) {
        state.foreignKeys.add('orders.FK_a922b820eeef29ac1c6800e826a');
      }

      if (sql.startsWith('ALTER TABLE `policy_consents` DROP FOREIGN KEY')) {
        state.foreignKeys.delete('policy_consents.FK_policy_consents_user');
      }

      if (sql.startsWith('ALTER TABLE `policy_consents` ADD CONSTRAINT `FK_policy_consents_user`')) {
        state.foreignKeys.add('policy_consents.FK_policy_consents_user');
      }

      if (sql.startsWith('CREATE TABLE `guest_order_access`')) {
        state.tables.add('guest_order_access');
        state.columns.add('guest_order_access.id');
        state.columns.add('guest_order_access.order_id');
        state.columns.add('guest_order_access.token_digest');
        state.columns.add('guest_order_access.expires_at');
        state.columns.add('guest_order_access.superseded_at');
        state.columns.add('guest_order_access.superseded_by_id');
        state.columns.add('guest_order_access.created_at');
        state.indexes.add('guest_order_access.IDX_guest_order_access_order_id');
        state.indexes.add('guest_order_access.IDX_guest_order_access_token_digest');
        state.indexes.add('guest_order_access.IDX_guest_order_access_expires_at');
        state.indexes.add('guest_order_access.IDX_guest_order_access_superseded_by_id');
      }

      if (sql.startsWith('ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_order_id`')) {
        state.foreignKeys.add('guest_order_access.FK_guest_order_access_order_id');
      }

      if (sql.startsWith('ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_superseded_by_id`')) {
        state.foreignKeys.add('guest_order_access.FK_guest_order_access_superseded_by_id');
      }

      return [];
    });

    return {
      queryRunner: { query } as unknown as QueryRunner,
      executed,
      state,
    };
  }

  it('applies the stage-31 schema changes in the locked migration order', async () => {
    const { queryRunner, executed } = createQueryRunner();

    await new AddGuestCheckoutSchema1786600000000().up(queryRunner);

    expect(executed).toEqual(
      expect.arrayContaining([
        'ALTER TABLE `orders` ADD COLUMN `guest_email_normalized` varchar(255) NULL AFTER `user_id`',
        "ALTER TABLE `orders` ADD COLUMN `order_locale` enum('ko', 'en') NULL AFTER `order_number`",
        "UPDATE `orders` SET `order_locale` = 'ko' WHERE `order_locale` IS NULL",
        'ALTER TABLE `orders` DROP FOREIGN KEY `FK_a922b820eeef29ac1c6800e826a`',
        'ALTER TABLE `orders` MODIFY COLUMN `user_id` bigint NULL',
        'ALTER TABLE `orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
        'ALTER TABLE `policy_consents` DROP FOREIGN KEY `FK_policy_consents_user`',
        'ALTER TABLE `policy_consents` MODIFY COLUMN `user_id` bigint NULL',
        'ALTER TABLE `policy_consents` ADD CONSTRAINT `FK_policy_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        'CREATE TABLE `guest_order_access` (`id` bigint NOT NULL AUTO_INCREMENT, `order_id` bigint NOT NULL, `token_digest` varchar(64) NOT NULL, `expires_at` datetime NOT NULL, `superseded_at` datetime NULL, `superseded_by_id` bigint NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_guest_order_access_order_id` (`order_id`), UNIQUE INDEX `IDX_guest_order_access_token_digest` (`token_digest`), INDEX `IDX_guest_order_access_expires_at` (`expires_at`), INDEX `IDX_guest_order_access_superseded_by_id` (`superseded_by_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
        'ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        'ALTER TABLE `guest_order_access` ADD CONSTRAINT `FK_guest_order_access_superseded_by_id` FOREIGN KEY (`superseded_by_id`) REFERENCES `guest_order_access`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
        "ALTER TABLE `orders` MODIFY COLUMN `order_locale` enum('ko', 'en') NOT NULL",
      ]),
    );

    const guestEmailIndex = executed.indexOf(
      'ALTER TABLE `orders` ADD COLUMN `guest_email_normalized` varchar(255) NULL AFTER `user_id`',
    );
    const orderLocaleIndex = executed.indexOf(
      "ALTER TABLE `orders` ADD COLUMN `order_locale` enum('ko', 'en') NULL AFTER `order_number`",
    );
    const backfillIndex = executed.indexOf(
      "UPDATE `orders` SET `order_locale` = 'ko' WHERE `order_locale` IS NULL",
    );
    const ordersDropFkIndex = executed.indexOf(
      'ALTER TABLE `orders` DROP FOREIGN KEY `FK_a922b820eeef29ac1c6800e826a`',
    );
    const ordersNullableIndex = executed.indexOf('ALTER TABLE `orders` MODIFY COLUMN `user_id` bigint NULL');
    const ordersAddFkIndex = executed.indexOf(
      'ALTER TABLE `orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    const policyDropFkIndex = executed.indexOf(
      'ALTER TABLE `policy_consents` DROP FOREIGN KEY `FK_policy_consents_user`',
    );
    const policyNullableIndex = executed.indexOf(
      'ALTER TABLE `policy_consents` MODIFY COLUMN `user_id` bigint NULL',
    );
    const policyAddFkIndex = executed.indexOf(
      'ALTER TABLE `policy_consents` ADD CONSTRAINT `FK_policy_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    const guestTableIndex = executed.findIndex((sql) => sql.startsWith('CREATE TABLE `guest_order_access`'));
    const orderLocaleNotNullIndex = executed.indexOf(
      "ALTER TABLE `orders` MODIFY COLUMN `order_locale` enum('ko', 'en') NOT NULL",
    );

    expect(guestEmailIndex).toBeGreaterThan(-1);
    expect(orderLocaleIndex).toBeGreaterThan(guestEmailIndex);
    expect(backfillIndex).toBeGreaterThan(orderLocaleIndex);
    expect(ordersDropFkIndex).toBeGreaterThan(backfillIndex);
    expect(ordersNullableIndex).toBeGreaterThan(ordersDropFkIndex);
    expect(ordersAddFkIndex).toBeGreaterThan(ordersNullableIndex);
    expect(policyDropFkIndex).toBeGreaterThan(ordersAddFkIndex);
    expect(policyNullableIndex).toBeGreaterThan(policyDropFkIndex);
    expect(policyAddFkIndex).toBeGreaterThan(policyNullableIndex);
    expect(guestTableIndex).toBeGreaterThan(policyAddFkIndex);
    expect(orderLocaleNotNullIndex).toBeGreaterThan(guestTableIndex);
  });

  it('preserves the locked foreign-key semantics and guest access storage shape', async () => {
    const { queryRunner, state, executed } = createQueryRunner();

    await new AddGuestCheckoutSchema1786600000000().up(queryRunner);

    expect(state.foreignKeys.has('orders.FK_a922b820eeef29ac1c6800e826a')).toBe(true);
    expect(state.foreignKeys.has('policy_consents.FK_policy_consents_user')).toBe(true);
    expect(state.foreignKeys.has('guest_order_access.FK_guest_order_access_order_id')).toBe(true);
    expect(state.foreignKeys.has('guest_order_access.FK_guest_order_access_superseded_by_id')).toBe(true);
    expect(state.indexes.has('guest_order_access.IDX_guest_order_access_token_digest')).toBe(true);
    expect(state.columns.has('orders.guest_email_normalized')).toBe(true);
    expect(state.columns.has('orders.order_locale')).toBe(true);

    expect(
      executed.some((sql) =>
        sql.includes('`policy_consents` ADD CONSTRAINT `FK_policy_consents_user`')
        && sql.includes('ON DELETE CASCADE'),
      ),
    ).toBe(true);
    expect(
      executed.some((sql) =>
        sql.includes('`orders` ADD CONSTRAINT `FK_a922b820eeef29ac1c6800e826a`')
        && sql.includes('ON DELETE RESTRICT'),
      ),
    ).toBe(true);
    expect(
      executed.some((sql) =>
        sql.startsWith('CREATE TABLE `guest_order_access`')
        && sql.includes('`token_digest` varchar(64) NOT NULL')
        && sql.includes('`expires_at` datetime NOT NULL')
        && sql.includes('`superseded_at` datetime NULL')
        && sql.includes('`superseded_by_id` bigint NULL'),
      ),
    ).toBe(true);
  });
});
