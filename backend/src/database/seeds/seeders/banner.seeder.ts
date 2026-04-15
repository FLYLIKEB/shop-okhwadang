/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Banner } from '../../../modules/promotions/entities/banner.entity';
import { banners } from '../data/seed-data';

export class BannerSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Banner);
    const inserted = await this.upsert(repo, banners as unknown as Partial<Banner>[], (e) => `${e.title}:${e.imageUrl}`);
    console.log(`✓ Banners: ${inserted} inserted, ${banners.length - inserted} existing`);
  }
}
