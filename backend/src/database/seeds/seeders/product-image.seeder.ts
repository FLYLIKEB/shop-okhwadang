import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductImage } from '../../../modules/products/entities/product-image.entity';
import { productImages } from '../data/seed-data';

export class ProductImageSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(ProductImage);
    await this.dataSource.getRepository(ProductImage).insert(productImages);
    console.log(`✓ Seeded ${productImages.length} product images`);
  }
}
