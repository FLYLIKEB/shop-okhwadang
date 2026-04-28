/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { ProductImage } from '../../../modules/products/entities/product-image.entity';
import { productImages } from '../data/seed-data';

export class ProductImageSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(ProductImage);
    const inserted = await this.upsert(
      repo,
      productImages.map((p) => ({ ...p, productId: p.productId } as unknown as Partial<ProductImage>)),
      (e) => `${e.productId}:${e.url}`,
    );
    console.log(`✓ Product images: ${inserted} inserted, ${productImages.length - inserted} existing`);
  }
}
