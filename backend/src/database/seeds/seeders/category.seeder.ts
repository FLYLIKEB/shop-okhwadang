import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Category } from '../../../modules/products/entities/category.entity';
import { categories } from '../data/seed-data';

export class CategorySeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Category);
    await this.dataSource.getRepository(Category).insert(categories);
    console.log(`✓ Seeded ${categories.length} categories`);
  }
}
