/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Category } from '../../../modules/products/entities/category.entity';
import { categories } from '../data/seed-data';

export class CategorySeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Category);
    const inserted = await this.upsert(repo, categories, (c) => c.slug);
    console.log(`✓ Categories: ${inserted} inserted, ${categories.length - inserted} existing`);
  }
}
