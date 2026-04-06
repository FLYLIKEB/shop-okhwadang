import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductDetailImage } from '../../../modules/products/entities/product-detail-image.entity';
import { productDetailImages } from '../data/seed-data';

export class ProductDetailImageSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(ProductDetailImage);
    await this.dataSource.getRepository(ProductDetailImage).insert(productDetailImages);
    console.log(`✓ Seeded ${productDetailImages.length} product detail images`);
  }
}
