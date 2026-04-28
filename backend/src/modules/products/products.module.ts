import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductDetailImage } from './entities/product-detail-image.entity';
import { Review } from '../reviews/entities/review.entity';
import { AttributeType } from './entities/attribute-type.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductsService } from './products.service';
import { ProductQueryService } from './product-query.service';
import { ProductCommandService } from './product-command.service';
import { CategoriesService } from './categories.service';
import { AttributesService } from './attributes.service';
import { RecentlyViewedService } from './recently-viewed.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { AttributesController } from './attributes.controller';
import { CacheModule } from '../cache/cache.module';
import { RestockAlertsModule } from '../restock-alerts/restock-alerts.module';
import { RecentlyViewedProduct } from './entities/recently-viewed-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      ProductOption,
      ProductImage,
      ProductDetailImage,
      Review,
      AttributeType,
      ProductAttribute,
      RecentlyViewedProduct,
    ]),
    CacheModule,
    RestockAlertsModule,
  ],
  providers: [
    ProductsService,
    ProductQueryService,
    ProductCommandService,
    CategoriesService,
    AttributesService,
    RecentlyViewedService,
  ],
  controllers: [ProductsController, CategoriesController, AttributesController],
  exports: [
    ProductsService,
    ProductQueryService,
    ProductCommandService,
    CategoriesService,
    AttributesService,
    RecentlyViewedService,
  ],
})
export class ProductsModule {}
