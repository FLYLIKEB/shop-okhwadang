import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Notice } from '../../../modules/notices/entities/notice.entity';
import { notices } from '../data/seed-data';

export class NoticeSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Notice);
    await this.dataSource.getRepository(Notice).insert(notices);
    console.log(`✓ Seeded ${notices.length} notices`);
  }
}
