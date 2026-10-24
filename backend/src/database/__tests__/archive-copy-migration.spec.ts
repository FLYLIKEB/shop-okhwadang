import { QueryRunner } from 'typeorm';
import blocks from '../migrations/data/archive-copy-1789100000000.json';
import { ReviseArchiveKoreanCopy1789100000000 } from '../migrations/1789100000000-ReviseArchiveKoreanCopy';

const migration = new ReviseArchiveKoreanCopy1789100000000();

function runner(query: jest.Mock): QueryRunner {
  return { query } as unknown as QueryRunner;
}

describe('archive copy migration boundaries', () => {
  it('backs up only matching archive slots with immutable native JSON replacements', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await migration.up(runner(query));
    expect(query.mock.calls[0][0]).toContain('original_content json NOT NULL');
    expect(query.mock.calls[0][0]).toContain('replacement_content json NOT NULL');
    expect(query).toHaveBeenCalledTimes(blocks.length + 2);

    blocks.forEach((block, index) => {
      const [sql, params] = query.mock.calls[index + 1];
      expect(sql).toContain('INSERT IGNORE');
      expect(sql).toContain("p.slug = 'archive' AND b.sort_order = ? AND b.type IN (?, ?)");
      expect(sql).toContain('CAST(? AS JSON)');
      expect(params).toEqual([block.type, JSON.stringify(block.content), block.sortOrder, block.previousType, block.type]);
    });
  });

  it('does not update blocks whose identity or content changed after backup', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await migration.up(runner(query));
    const sql = query.mock.calls.at(-1)![0] as string;
    expect(sql).toContain('backup.page_id = b.page_id');
    expect(sql).toContain("p.slug = 'archive' AND b.sort_order = backup.sort_order");
    expect(sql).toContain('BINARY b.type = BINARY backup.original_type AND b.content = backup.original_content');
    expect(sql).not.toMatch(/SET[^]*is_visible\s*=/);
  });

  it('restores only unedited replacement values and retains the backup', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await migration.down(runner(query));
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('SET b.type = backup.original_type, b.content = backup.original_content');
    expect(sql).toContain('BINARY b.type = BINARY backup.replacement_type AND b.content = backup.replacement_content');
    expect(sql).toContain('backup.page_id = b.page_id');
    expect(sql).not.toContain('DROP TABLE');
  });
});
