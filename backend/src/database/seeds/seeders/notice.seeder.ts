/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Notice } from '../../../modules/notices/entities/notice.entity';
import { notices } from '../data/seed-data';

export class NoticeSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Notice);
    const inserted = await this.upsert(repo, notices as unknown as Partial<Notice>[], (n) => n.title);
    console.log(`✓ Notices: ${inserted} inserted, ${notices.length - inserted} existing`);
  }
}
