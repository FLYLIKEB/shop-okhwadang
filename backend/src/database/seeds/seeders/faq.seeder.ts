/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Faq } from '../../../modules/faqs/entities/faq.entity';
import { faqs } from '../data/seed-data';

export class FaqSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Faq);
    const inserted = await this.upsert(repo, faqs as unknown as Partial<Faq>[], (f) => `${f.question}:${f.category}`);
    console.log(`✓ FAQs: ${inserted} inserted, ${faqs.length - inserted} existing`);
  }
}
