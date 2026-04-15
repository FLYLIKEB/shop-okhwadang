/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductDetailImage } from '../../../modules/products/entities/product-detail-image.entity';
import { productDetailImages } from '../data/seed-data';

export class ProductDetailImageSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(ProductDetailImage);
    const inserted = await this.upsert(
      repo,
      productDetailImages.map((p) => ({ ...p } as unknown as Partial<ProductDetailImage>)),
      (e) => `${e.productId}:${e.url}:${e.sortOrder}`,
    );
    console.log(`✓ Product detail images: ${inserted} inserted, ${productDetailImages.length - inserted} existing`);
  }
}
