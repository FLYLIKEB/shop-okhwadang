import { DataSource, QueryRunner } from 'typeorm';
import { EnglishUiLabels1788800000000 } from '../src/database/migrations/1788800000000-EnglishUiLabels';

describe('English UI labels migration (isolated MySQL)', () => {
  const databaseName = `commerce_english_ui_${process.pid}_test`;
  const migration = new EnglishUiLabels1788800000000();
  const announcement = '아직 작업중인 쇼핑몰이며, 모든 것들은 더미 데이터입니다';
  let admin: DataSource;
  let database: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    const testUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(testUrl.hostname) || !testUrl.pathname.endsWith('_test')) {
      throw new Error('English UI tests require a local database ending in _test');
    }
    admin = await new DataSource({ type: 'mysql', url: testUrl.toString() }).initialize();
    await admin.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    testUrl.pathname = `/${databaseName}`;
    database = await new DataSource({ type: 'mysql', url: testUrl.toString(), charset: 'utf8mb4' }).initialize();
    queryRunner = database.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`CREATE TABLE site_settings (
      id bigint PRIMARY KEY, setting_key varchar(100) NOT NULL, label varchar(100) NOT NULL,
      value text NOT NULL, value_en text NULL, default_value varchar(200) NOT NULL
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE announcement_bars (
      id bigint PRIMARY KEY, message varchar(255) NOT NULL, message_en varchar(255) NULL
    ) ENGINE=InnoDB`);
  });

  beforeEach(async () => {
    await queryRunner.query('DROP TABLE IF EXISTS english_ui_backup_1788800000000');
    await queryRunner.query('DELETE FROM site_settings');
    await queryRunner.query('DELETE FROM announcement_bars');
    await queryRunner.query(`INSERT INTO site_settings VALUES
      (1, 'color_primary', '대표색', '#123456', NULL, '#000000'),
      (2, 'business_address', '주소', '한국 주소', 'English address', '기본 주소'),
      (3, 'unknown_custom_key', '사용자 정의', '보존', NULL, '보존'),
      (4, 'font_size_base', 'Custom English label', '16px', NULL, '16px')`);
    await queryRunner.query('INSERT INTO announcement_bars VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)', [
      1, announcement, null, 2, announcement, '', 3, announcement, 'Existing English notice', 4, '다른 공지', null,
    ]);
  });

  afterAll(async () => {
    if (queryRunner) await queryRunner.release();
    if (database?.isInitialized) await database.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await admin.destroy();
    }
  });

  async function snapshot(): Promise<{ settings: Record<string, unknown>[]; announcements: Record<string, unknown>[] }> {
    return {
      settings: await queryRunner.query('SELECT * FROM site_settings ORDER BY id'),
      announcements: await queryRunner.query('SELECT * FROM announcement_bars ORDER BY id'),
    };
  }

  it('translates only known Korean labels and missing known announcement translations, preserving all values', async () => {
    const before = await snapshot();
    await migration.up(queryRunner);
    const after = await snapshot();
    expect(after.settings).toEqual(before.settings.map((row) => ({
      ...row, label: Number(row.id) === 1 ? 'PRIMARY COLOR' : Number(row.id) === 2 ? 'ADDRESS' : row.label,
    })));
    expect(after.announcements).toEqual(before.announcements.map((row) => ({
      ...row, message_en: Number(row.id) <= 2 ? 'This store is still under development. All content is sample data.' : row.message_en,
    })));
    await migration.up(queryRunner);
    expect(await snapshot()).toEqual(after);
    await migration.down(queryRunner);
    expect(await snapshot()).toEqual(before);
  });

  it('preserves later administrator edits on rerun and rollback', async () => {
    await migration.up(queryRunner);
    await queryRunner.query("UPDATE site_settings SET label = 'My primary color', value = '#abcdef' WHERE id = 1");
    await queryRunner.query("UPDATE announcement_bars SET message_en = 'New announcement' WHERE id = 1");
    await queryRunner.query("UPDATE announcement_bars SET message = '새로운 공지' WHERE id = 2");
    const edited = await snapshot();
    await migration.up(queryRunner);
    expect(await snapshot()).toEqual(edited);
    await migration.down(queryRunner);
    const after = await snapshot();
    expect(after.settings[0]).toEqual(edited.settings[0]);
    expect(after.announcements).toEqual(edited.announcements);
    expect(after.settings[1].label).toBe('주소');
  });
});
