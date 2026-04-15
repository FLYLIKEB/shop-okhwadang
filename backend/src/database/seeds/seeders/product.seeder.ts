import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Product } from '../../../modules/products/entities/product.entity';
import { products } from '../data/seed-data';

export class ProductSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Product);
    const inserted = await this.upsert(repo, products, (p) => p.slug);
    console.log(`✓ Products: ${inserted} inserted, ${products.length - inserted} existing`);
  }
}
