import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Promotion } from '../../../modules/promotions/entities/promotion.entity';
import { promotions } from '../data/seed-data';

export class PromotionSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Promotion);
    await this.dataSource.getRepository(Promotion).insert(promotions);
    console.log(`✓ Seeded ${promotions.length} promotions`);
  }
}
