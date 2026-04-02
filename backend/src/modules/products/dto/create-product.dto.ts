import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export { ProductStatus };

export class CreateProductDto {
  @ApiProperty({ example: 1, description: '카테고리 ID', required: false })
  @IsOptional()
  @IsNumber({}, { message: '카테고리 ID는 숫자여야 합니다.' })
  categoryId?: number;

  @ApiProperty({ example: '옥화당 보이차', description: '상품명' })
  @IsString({ message: '상품명을 입력해 주세요.' })
  @MaxLength(255, { message: '상품명은 최대 255자까지 입력 가능합니다.' })
  name!: string;

  @ApiProperty({ example: 'okhwadang-boheicha', description: 'URL 슬러그 (영문 소문자, 숫자, 하이픈)' })
  @IsString({ message: '슬러그를 입력해 주세요.' })
  @MaxLength(255, { message: '슬러그는 최대 255자까지 입력 가능합니다.' })
  slug!: string;

  @ApiProperty({ example: '신선한 원두를 사용하여 만든 전통 방식의 보이차...', description: '상품 상세 설명', required: false })
  @IsOptional()
  @IsString({ message: '상품 설명은 문자열이어야 합니다.' })
  description?: string;

  @ApiProperty({ example: '부드러운 맛과 깊은 향', description: '짧은 설명 (500자 이내)', required: false })
  @IsOptional()
  @IsString({ message: '짧은 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '짧은 설명은 최대 500자까지 입력 가능합니다.' })
  shortDescription?: string;

  @ApiProperty({ example: 35000, description: '가격 (원)' })
  @IsNumber({}, { message: '가격은 숫자여야 합니다.' })
  @Min(1, { message: '가격은 최소 1원 이상이어야 합니다.' })
  price!: number;

  @ApiProperty({ example: 30000, description: '할인가 (원)', required: false })
  @IsOptional()
  @IsNumber({}, { message: '할인가는 숫자여야 합니다.' })
  @Min(0, { message: '할인가는 0 이상이어야 합니다.' })
  salePrice?: number;

  @ApiProperty({ example: 100, description: '재고 수량', required: false })
  @IsOptional()
  @IsNumber({}, { message: '재고는 숫자여야 합니다.' })
  @Min(0, { message: '재고는 0 이상이어야 합니다.' })
  stock?: number;

  @ApiProperty({ example: 'OCH-001', description: 'SKU 코드', required: false })
  @IsOptional()
  @IsString({ message: 'SKU는 문자열이어야 합니다.' })
  @MaxLength(100, { message: 'SKU는 최대 100자까지 입력 가능합니다.' })
  sku?: string;

  @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, description: '상품 상태', required: false })
  @IsOptional()
  @IsEnum(ProductStatus, { message: '올바른 상품 상태를 선택해 주세요.' })
  status?: ProductStatus;

  @ApiProperty({ example: true, description: '추천 상품 여부', required: false })
  @IsOptional()
  @IsBoolean({ message: '추천 상품 여부는 불리언이어야 합니다.' })
  isFeatured?: boolean;
}
