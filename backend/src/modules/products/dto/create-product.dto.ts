import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export { ProductStatus };

export class CreateProductDto {
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(255)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsNumber()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
