import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductOption } from '../../../modules/products/entities/product-option.entity';
import { productOptions } from '../data/seed-data';

export class ProductOptionSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(ProductOption);
    await this.dataSource.getRepository(ProductOption).insert(productOptions);
    console.log(`✓ Seeded ${productOptions.length} product options`);
  }
}
