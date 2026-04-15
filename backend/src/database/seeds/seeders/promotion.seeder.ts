/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Promotion } from '../../../modules/promotions/entities/promotion.entity';
import { promotions } from '../data/seed-data';

export class PromotionSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Promotion);
    const inserted = await this.upsert(repo, promotions as unknown as Partial<Promotion>[], (e) => `${e.title}:${e.startsAt}`);
    console.log(`✓ Promotions: ${inserted} inserted, ${promotions.length - inserted} existing`);
  }
}
