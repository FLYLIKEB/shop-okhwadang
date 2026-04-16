/* eslint-disable no-console */
import 'reflect-metadata';
import 'dotenv/config';
import { CategorySeeder } from './seeders/category.seeder';
import { ProductSeeder } from './seeders/product.seeder';
import { ProductImageSeeder } from './seeders/product-image.seeder';
import { ProductDetailImageSeeder } from './seeders/product-detail-image.seeder';
import { ProductOptionSeeder } from './seeders/product-option.seeder';
import { NavigationItemSeeder } from './seeders/navigation-item.seeder';
import { BannerSeeder } from './seeders/banner.seeder';
import { PromotionSeeder } from './seeders/promotion.seeder';
import { NoticeSeeder } from './seeders/notice.seeder';
import { FaqSeeder } from './seeders/faq.seeder';
import { UserSeeder } from './seeders/user.seeder';
import { OrderSeeder } from './seeders/order.seeder';
import { PageSeeder } from './seeders/page.seeder';
import { PageBlockSeeder } from './seeders/page-block.seeder';
import { Seeder } from './base/seeder';
import dataSource from '../typeorm.config';

const seeders: Seeder[] = [
  new CategorySeeder(dataSource),
  new ProductSeeder(dataSource),
  new ProductImageSeeder(dataSource),
  new ProductDetailImageSeeder(dataSource),
  new ProductOptionSeeder(dataSource),
  new NavigationItemSeeder(dataSource),
  new BannerSeeder(dataSource),
  new PromotionSeeder(dataSource),
  new NoticeSeeder(dataSource),
  new FaqSeeder(dataSource),
  new UserSeeder(dataSource),
  new OrderSeeder(dataSource),
  new PageSeeder(dataSource),
  new PageBlockSeeder(dataSource),
];

async function runSeed() {
  console.log('🌱 Starting seed...\n');

  try {
    await dataSource.initialize();
    console.log('✓ Database connected\n');

    for (const seeder of seeders) {
      await seeder.run();
    }

    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
