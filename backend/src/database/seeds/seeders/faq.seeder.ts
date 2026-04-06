import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Faq } from '../../../modules/faqs/entities/faq.entity';
import { faqs } from '../data/seed-data';

export class FaqSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Faq);
    await this.dataSource.getRepository(Faq).insert(faqs);
    console.log(`✓ Seeded ${faqs.length} faqs`);
  }
}
