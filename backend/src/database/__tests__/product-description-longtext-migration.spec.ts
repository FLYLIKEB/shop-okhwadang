import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { Product } from '../../modules/products/entities/product.entity';
import { ExpandProductDescriptionsToLongtext1789000000000 } from '../migrations/1789000000000-ExpandProductDescriptionsToLongtext';

const migration = new ExpandProductDescriptionsToLongtext1789000000000();
const columns = ['description', 'description_en', 'description_ja', 'description_zh'];

function runner(query: jest.Mock): QueryRunner {
  return { query } as unknown as QueryRunner;
}

describe('product description longtext migration', () => {
  it('keeps every description entity column and migration large enough for imported HTML', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await migration.up(runner(query));

    const metadata = getMetadataArgsStorage().columns.filter((column) => column.target === Product);
    for (const column of columns) {
      expect(query.mock.calls[0][0]).toContain(`MODIFY COLUMN \`${column}\` LONGTEXT NULL`);
      const entityColumn = metadata.find((entry) => (entry.options.name ?? entry.propertyName) === column);
      expect(entityColumn?.options).toMatchObject({ type: 'longtext', nullable: true });
    }
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('refuses rollback before altering any column when an existing description is too large', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 63 }]);
    await expect(migration.down(runner(query))).rejects.toThrow('65535바이트');
    expect(query).toHaveBeenCalledTimes(1);
    for (const column of columns) {
      expect(query.mock.calls[0][0]).toContain(`OCTET_LENGTH(\`${column}\`) > 65535`);
    }
  });

  it('uses strict mode when narrowing and restores the original session mode', async () => {
    const query = jest.fn().mockResolvedValue([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sqlMode: 'IGNORE_SPACE,NO_ENGINE_SUBSTITUTION' }]);
    await migration.down(runner(query));

    expect(query.mock.calls[2]).toEqual(['SET SESSION sql_mode = ?', ['IGNORE_SPACE,NO_ENGINE_SUBSTITUTION,STRICT_ALL_TABLES']]);
    for (const column of columns) {
      expect(query.mock.calls[3][0]).toContain(`MODIFY COLUMN \`${column}\` TEXT NULL`);
    }
    expect(query.mock.calls[4]).toEqual(['SET SESSION sql_mode = ?', ['IGNORE_SPACE,NO_ENGINE_SUBSTITUTION']]);
  });

  it('preserves data errors and restores sql mode if the narrowing ALTER fails', async () => {
    const error = new Error('Data too long');
    const query = jest.fn().mockResolvedValue([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sqlMode: 'STRICT_ALL_TABLES' }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(error);

    await expect(migration.down(runner(query))).rejects.toBe(error);
    expect(query.mock.calls[2]).toEqual(['SET SESSION sql_mode = ?', ['STRICT_ALL_TABLES']]);
    expect(query.mock.calls[4]).toEqual(['SET SESSION sql_mode = ?', ['STRICT_ALL_TABLES']]);
  });
});
