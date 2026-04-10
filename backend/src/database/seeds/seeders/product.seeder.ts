import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Product } from '../../../modules/products/entities/product.entity';
import { products } from '../data/seed-data';

export class ProductSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Product);
    await this.dataSource.getRepository(Product).insert(products);
    console.log(`✓ Seeded ${products.length} products`);
  }
}
