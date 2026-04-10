import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Banner } from '../../../modules/promotions/entities/banner.entity';
import { banners } from '../data/seed-data';

export class BannerSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Banner);
    await this.dataSource.getRepository(Banner).insert(banners);
    console.log(`✓ Seeded ${banners.length} banners`);
  }
}
