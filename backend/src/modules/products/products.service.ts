import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductCommandService } from './product-command.service';
import { ProductQueryService } from './product-query.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productQueryService: ProductQueryService,
    private readonly productCommandService: ProductCommandService,
  ) {}

  findAll(
    query: QueryProductsDto,
    isAdmin = false,
  ): Promise<{
    items: (Product & { rating: number; reviewCount: number })[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.productQueryService.findAll(query, isAdmin);
  }

  findOne(id: number, isAdmin = false, locale?: string): Promise<Product> {
    return this.productQueryService.findOne(id, isAdmin, locale);
  }

  create(dto: CreateProductDto): Promise<Product> {
    return this.productCommandService.create(dto);
  }

  update(id: number, dto: UpdateProductDto): Promise<Product> {
    return this.productCommandService.update(id, dto);
  }

  remove(id: number): Promise<{ message: string }> {
    return this.productCommandService.remove(id);
  }

  findBulk(
    ids: number[],
    isAdmin = false,
    locale?: string,
  ): Promise<(Product & { rating: number; reviewCount: number })[]> {
    return this.productQueryService.findBulk(ids, isAdmin, locale);
  }

  autocomplete(q: string): Promise<{ id: number; name: string; slug: string }[]> {
    return this.productQueryService.autocomplete(q);
  }
}
