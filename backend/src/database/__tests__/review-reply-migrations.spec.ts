import { QueryRunner } from 'typeorm';
import { AddReviewRepliesAndAttributeLinks1785500000000 } from '../migrations/1785500000000-AddReviewRepliesAndAttributeLinks';
import { EnsureReviewReplyColumns1785500001000 } from '../migrations/1785500001000-EnsureReviewReplyColumns';

describe('review reply migrations', () => {
  function createQueryRunner(existingColumns = new Set<string>(), existingForeignKeys = new Set<string>()) {
    const executed: string[] = [];
    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      executed.push(sql);
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        const key = `${String(params?.[0])}.${String(params?.[1])}`;
        return existingColumns.has(key) ? [{ COLUMN_NAME: String(params?.[1]) }] : [];
      }
      if (sql.includes('INFORMATION_SCHEMA.TABLE_CONSTRAINTS')) {
        const key = `${String(params?.[0])}.${String(params?.[1])}`;
        return existingForeignKeys.has(key) ? [{ CONSTRAINT_NAME: String(params?.[1]) }] : [];
      }
      return [];
    });

    return {
      queryRunner: { query } as unknown as QueryRunner,
      executed,
    };
  }

  it('keeps the original mixed migration idempotent so review reply columns are not blocked', async () => {
    const existingColumns = new Set(['attribute_types.parent_id', 'attribute_types.related_type_ids']);
    const existingForeignKeys = new Set(['attribute_types.fk_attribute_types_parent']);
    const { queryRunner, executed } = createQueryRunner(existingColumns, existingForeignKeys);

    await new AddReviewRepliesAndAttributeLinks1785500000000().up(queryRunner);

    expect(executed.some((sql) => sql.includes('ADD COLUMN `parent_id`'))).toBe(false);
    expect(executed.some((sql) => sql.includes('ADD CONSTRAINT `fk_attribute_types_parent`'))).toBe(false);
    expect(executed).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ALTER TABLE `reviews` ADD COLUMN `admin_reply_content`'),
        expect.stringContaining('ALTER TABLE `external_reviews` ADD COLUMN `admin_reply_content`'),
      ]),
    );
  });

  it('adds missing review reply columns as a forward-only safety net', async () => {
    const existingColumns = new Set([
      'reviews.admin_reply_content',
      'reviews.admin_reply_author',
      'reviews.admin_replied_at',
    ]);
    const { queryRunner, executed } = createQueryRunner(existingColumns);

    await new EnsureReviewReplyColumns1785500001000().up(queryRunner);

    expect(executed.some((sql) => sql.includes('ALTER TABLE `reviews` ADD COLUMN'))).toBe(false);
    expect(executed).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ALTER TABLE `external_reviews` ADD COLUMN `admin_reply_content`'),
        expect.stringContaining('ALTER TABLE `external_reviews` ADD COLUMN `admin_reply_author`'),
        expect.stringContaining('ALTER TABLE `external_reviews` ADD COLUMN `admin_replied_at`'),
      ]),
    );
  });
});
