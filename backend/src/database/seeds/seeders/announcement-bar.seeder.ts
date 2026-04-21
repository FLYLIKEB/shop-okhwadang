/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { AnnouncementBar } from '../../../modules/announcement-bars/entities/announcement-bar.entity';
import { announcementBars } from '../data/seed-data';

export class AnnouncementBarSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(AnnouncementBar);
    const inserted = await this.upsert(
      repo,
      announcementBars as unknown as Partial<AnnouncementBar>[],
      (e) => `${e.message}:${e.sort_order}`,
    );
    console.log(`✓ Announcement bars: ${inserted} inserted, ${announcementBars.length - inserted} existing`);
  }
}
