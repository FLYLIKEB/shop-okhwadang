import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductOption } from '../../../modules/products/entities/product-option.entity';
import { productOptions } from '../data/seed-data';

export class ProductOptionSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(ProductOption);
    const inserted = await this.upsert(
      repo,
      productOptions.map((p) => ({ ...p } as any)),
      (e) => `${e.productId}:${e.name}:${e.value}`,
    );
    console.log(`✓ Product options: ${inserted} inserted, ${productOptions.length - inserted} existing`);
  }
}
