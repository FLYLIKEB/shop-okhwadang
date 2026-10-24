import { DataSource, QueryRunner } from 'typeorm';
import blocks from '../src/database/migrations/data/archive-copy-1789100000000.json';
import { ReviseArchiveKoreanCopy1789100000000 } from '../src/database/migrations/1789100000000-ReviseArchiveKoreanCopy';

const BACKUP_TABLE = 'archive_copy_backup_1789100000000';
const migration = new ReviseArchiveKoreanCopy1789100000000();

interface BlockRow {
  id: number;
  page_id: number;
  type: string;
  content: Record<string, unknown>;
  sort_order: number;
  is_visible: number;
}

describe('archive copy migration MySQL safety', () => {
  let db: DataSource;
  let runner: QueryRunner;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL!;
    if (!new URL(url).pathname.endsWith('_test')) throw new Error('Archive migration tests require a dedicated _test database');
    db = await new DataSource({ type: 'mysql', url, charset: 'utf8mb4', synchronize: false }).initialize();
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE TEMPORARY TABLE pages (id bigint PRIMARY KEY, slug varchar(255) NOT NULL)');
    await runner.query(`CREATE TEMPORARY TABLE page_blocks (
      id bigint PRIMARY KEY, page_id bigint NOT NULL, type varchar(50) NOT NULL,
      content json NOT NULL, sort_order int NOT NULL, is_visible boolean NOT NULL
    )`);
    await runner.query(`CREATE TEMPORARY TABLE ${BACKUP_TABLE} (
      block_id bigint NOT NULL PRIMARY KEY, page_id bigint NOT NULL, sort_order int NOT NULL,
      original_type varchar(50) NOT NULL, replacement_type varchar(50) NOT NULL,
      original_content json NOT NULL, replacement_content json NOT NULL
    )`);
  });

  afterAll(async () => {
    if (runner) {
      for (const table of [BACKUP_TABLE, 'page_blocks', 'pages']) {
        await runner.query(`DROP TEMPORARY TABLE IF EXISTS ${table}`);
      }
      await runner.release();
    }
    if (db?.isInitialized) await db.destroy();
  });

  it('does not create a page or blocks when archive has not been seeded', async () => {
    await migration.up(runner);
    const [{ pages }] = await runner.query('SELECT COUNT(*) AS pages FROM pages');
    const [{ blocks: count }] = await runner.query('SELECT COUNT(*) AS blocks FROM page_blocks');
    const [{ backups }] = await runner.query(`SELECT COUNT(*) AS backups FROM ${BACKUP_TABLE}`);
    expect([Number(pages), Number(count), Number(backups)]).toEqual([0, 0, 0]);
  });

  it('preserves other pages and custom blocks, is rerunnable and keeps later admin edits on rollback', async () => {
    await runner.query("INSERT INTO pages VALUES (1, 'archive'), (2, 'collection')");
    for (const [index, block] of blocks.entries()) {
      await runner.query('INSERT INTO page_blocks VALUES (?, 1, ?, ?, ?, ?)', [
        index + 1, block.previousType, JSON.stringify({ title: `기존 ${index}`, items: [{ label: '保留' }] }), block.sortOrder, index % 2,
      ]);
    }
    await runner.query("INSERT INTO page_blocks VALUES (900, 2, 'hero_banner', ?, -1, 1), (901, 1, 'text_content', ?, 88, 0)", [
      JSON.stringify({ title: '다른 페이지' }), JSON.stringify({ title: '관리자 추가 블록' }),
    ]);
    const original: BlockRow[] = await runner.query('SELECT * FROM page_blocks ORDER BY id');
    await migration.up(runner);
    const applied: BlockRow[] = await runner.query('SELECT * FROM page_blocks ORDER BY id');
    blocks.forEach((block, index) => {
      expect(applied[index]).toMatchObject({
        id: original[index].id, page_id: original[index].page_id, sort_order: block.sortOrder,
        is_visible: original[index].is_visible, type: block.type, content: block.content,
      });
    });
    expect(applied.slice(blocks.length)).toEqual(original.slice(blocks.length));

    const edited = { ...blocks[0].content, adminNote: '배포 후 수정' };
    await runner.query('UPDATE page_blocks SET content = ? WHERE id = 1', [JSON.stringify(edited)]);
    await migration.up(runner);
    const [afterRetry]: BlockRow[] = await runner.query('SELECT * FROM page_blocks WHERE id = 1');
    expect(afterRetry.content).toEqual(edited);
    const [{ count }] = await runner.query(`SELECT COUNT(*) AS count FROM ${BACKUP_TABLE}`);
    expect(Number(count)).toBe(blocks.length);

    // MySQL must compare JSON objects, not JavaScript key serialization order.
    await runner.query('UPDATE page_blocks SET content = ? WHERE id = 2', [JSON.stringify(Object.fromEntries(Object.entries(blocks[1].content).reverse()))]);
    await migration.down(runner);
    const restored: BlockRow[] = await runner.query('SELECT * FROM page_blocks ORDER BY id');
    expect(restored[0].content).toEqual(edited);
    expect(restored.slice(1)).toEqual(original.slice(1));
    const [{ retained }] = await runner.query(`SELECT COUNT(*) AS retained FROM ${BACKUP_TABLE}`);
    expect(Number(retained)).toBe(blocks.length);
  });
});
