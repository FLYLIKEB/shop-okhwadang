import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export { ProductStatus };

export class CreateProductDto {
  @IsOptional()
  @IsNumber({}, { message: '카테고리 ID는 숫자여야 합니다.' })
  categoryId?: number;

  @IsString({ message: '상품명을 입력해 주세요.' })
  @MaxLength(255, { message: '상품명은 최대 255자까지 입력 가능합니다.' })
  name!: string;

  @IsString({ message: '슬러그를 입력해 주세요.' })
  @MaxLength(255, { message: '슬러그는 최대 255자까지 입력 가능합니다.' })
  slug!: string;

  @IsOptional()
  @IsString({ message: '상품 설명은 문자열이어야 합니다.' })
  description?: string;

  @IsOptional()
  @IsString({ message: '짧은 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '짧은 설명은 최대 500자까지 입력 가능합니다.' })
  shortDescription?: string;

  @IsNumber({}, { message: '가격은 숫자여야 합니다.' })
  @Min(1, { message: '가격은 최소 1원 이상이어야 합니다.' })
  price!: number;

  @IsOptional()
  @IsNumber({}, { message: '할인가는 숫자여야 합니다.' })
  @Min(0, { message: '할인가는 0 이상이어야 합니다.' })
  salePrice?: number;

  @IsOptional()
  @IsNumber({}, { message: '재고는 숫자여야 합니다.' })
  @Min(0, { message: '재고는 0 이상이어야 합니다.' })
  stock?: number;

  @IsOptional()
  @IsString({ message: 'SKU는 문자열이어야 합니다.' })
  @MaxLength(100, { message: 'SKU는 최대 100자까지 입력 가능합니다.' })
  sku?: string;

  @IsOptional()
  @IsEnum(ProductStatus, { message: '올바른 상품 상태를 선택해 주세요.' })
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean({ message: '추천 상품 여부는 불리언이어야 합니다.' })
  isFeatured?: boolean;
}
