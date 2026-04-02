import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductImage } from './entities/product-image.entity';
import { Review } from '../reviews/entities/review.entity';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductOption, ProductImage, Review]),
  ],
  providers: [ProductsService, CategoriesService],
  controllers: [ProductsController, CategoriesController],
  exports: [ProductsService, CategoriesService],
})
export class ProductsModule {}
