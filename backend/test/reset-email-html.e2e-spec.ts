import { DataSource, QueryRunner } from 'typeorm';
import { ResetSavedEmailHtml1788500000002 } from '../src/database/migrations/1788500000002-ResetSavedEmailHtml';
import emailHtml from '../src/database/migrations/data/email-html-1788500000002.json';

interface TemplateRow {
  channel: string;
  key: string;
  locale: string;
  subject: string;
  html: string;
  text: string;
  template_id: string;
  pending_template_id: string;
}

describe('saved email HTML reset (isolated MySQL)', () => {
  const databaseName = `commerce_email_html_${process.pid}_test`;
  const backupTable = 'notification_email_html_backup_1788500000002';
  const migration = new ResetSavedEmailHtml1788500000002();
  const fixtures: TemplateRow[] = Object.entries(emailHtml).flatMap(([key, locales]) =>
    Object.keys(locales).map((locale) => ({
      channel: 'email', key, locale, subject: `saved subject ${key} ${locale}`,
      html: `<p>saved custom ${key} ${locale}</p>`, text: `saved text ${locale}`,
      template_id: 'existing-id', pending_template_id: 'pending-id',
    })),
  );
  const alimtalk: TemplateRow = {
    channel: 'alimtalk', key: 'PAYMENT_CONFIRMED', locale: 'ko',
    subject: 'saved alimtalk', html: '', text: 'saved message',
    template_id: 'approved-id', pending_template_id: 'review-id',
  };
  let admin: DataSource;
  let database: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    const testUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(testUrl.hostname)
      || !testUrl.pathname.endsWith('_test') || !databaseName.endsWith('_test')) {
      throw new Error('Email reset tests require a local database ending in _test');
    }
    admin = await new DataSource({ type: 'mysql', url: testUrl.toString() }).initialize();
    await admin.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4`);
    testUrl.pathname = `/${databaseName}`;
    database = await new DataSource({ type: 'mysql', url: testUrl.toString(), charset: 'utf8mb4' }).initialize();
    queryRunner = database.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`CREATE TABLE notification_templates (
      channel varchar(16) NOT NULL, \`key\` varchar(64) NOT NULL, locale varchar(2) NOT NULL,
      subject varchar(255) NOT NULL, html mediumtext NOT NULL, text text NOT NULL,
      template_id varchar(100) NOT NULL, pending_template_id varchar(100) NOT NULL,
      updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (channel, \`key\`, locale)
    ) ENGINE=InnoDB`);
  });

  beforeEach(async () => {
    await queryRunner.query(`DROP TABLE IF EXISTS ${backupTable}`);
    await queryRunner.query('DELETE FROM notification_templates');
    for (const row of [...fixtures, alimtalk]) {
      await queryRunner.query(
        'INSERT INTO notification_templates (channel, `key`, locale, subject, html, text, template_id, pending_template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [row.channel, row.key, row.locale, row.subject, row.html, row.text, row.template_id, row.pending_template_id],
      );
    }
  });

  afterAll(async () => {
    if (queryRunner) await queryRunner.release();
    if (database?.isInitialized) await database.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await admin.destroy();
    }
  });

  async function rows(): Promise<TemplateRow[]> {
    return queryRunner.query('SELECT channel, `key`, locale, subject, html, text, template_id, pending_template_id FROM notification_templates');
  }

  it('replaces every saved email HTML, preserves other fields and backs up originals on reruns', async () => {
    expect(fixtures).toHaveLength(16);
    await migration.up(queryRunner);
    await migration.up(queryRunner);

    const saved = await rows();
    expect(saved).toHaveLength(17);
    expect(saved).toContainEqual(alimtalk);
    for (const original of fixtures) {
      const replacement = emailHtml[original.key as keyof typeof emailHtml][original.locale as 'ko' | 'en'];
      expect(saved).toContainEqual({ ...original, html: replacement });
    }
    const backups: Array<{ key: string; locale: string; html: string }> = await queryRunner.query(
      `SELECT \`key\`, locale, original_html AS html FROM ${backupTable}`,
    );
    expect(backups).toHaveLength(16);
    for (const original of fixtures) {
      expect(backups).toContainEqual({ key: original.key, locale: original.locale, html: original.html });
    }
  });

  it('restores originals on rollback while preserving an administrator edit made after migration', async () => {
    await migration.up(queryRunner);
    const edited = fixtures[0];
    await queryRunner.query(
      'UPDATE notification_templates SET html = ? WHERE channel = ? AND `key` = ? AND locale = ?',
      ['<p>new administrator edit</p>', edited.channel, edited.key, edited.locale],
    );
    await migration.down(queryRunner);

    const saved = await rows();
    expect(saved).toContainEqual(alimtalk);
    for (const original of fixtures) {
      expect(saved).toContainEqual(original === edited
        ? { ...original, html: '<p>new administrator edit</p>' } : original);
    }
  });

  it('rejects unknown saved email keys before overwriting any HTML', async () => {
    await queryRunner.query(
      'INSERT INTO notification_templates (channel, `key`, locale, subject, html, text, template_id, pending_template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['email', 'UNKNOWN_EMAIL', 'ko', 'unknown subject', '<p>unknown custom</p>', '', '', ''],
    );
    const before = await rows();
    await expect(migration.up(queryRunner)).rejects.toThrow();
    expect(await rows()).toEqual(before);
  });
});
