import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';
import { ProductImageInputDto, ProductDetailImageInputDto } from './create-product.dto';

export class UpdateProductDto {
  @ApiProperty({ example: 1, description: '카테고리 ID', required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ example: '옥화당 보이차', description: '상품명', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'okhwadang-boheicha', description: 'URL 슬러그', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: '신선한 원두를 사용하여 만든 전통 방식의 보이차...', description: '상품 상세 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '부드러운 맛과 깊은 향', description: '짧은 설명', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiProperty({ example: 35000, description: '가격 (원)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiProperty({ example: 30000, description: '할인가 (원)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ example: 100, description: '재고 수량', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 'OCH-001', description: 'SKU 코드', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, description: '상품 상태', required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ example: true, description: '추천 상품 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 'Okhwadang Pu-erh Tea', description: '상품명 (영문)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ example: '玉花堂 普洱茶', description: '상품명 (일본어)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ example: '玉花堂 普洱茶', description: '상품명 (중문)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ example: 'Traditional pu-erh tea...', description: '상품 상세 설명 (영문)' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ example: '伝統的な普洱茶...', description: '상품 상세 설명 (일본어)' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ example: '传统普洱茶...', description: '상품 상세 설명 (중문)' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ example: 'Smooth taste and deep aroma', description: '짧은 설명 (영문, 500자 이내)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescriptionEn?: string;

  @ApiPropertyOptional({ example: 'なめらかな味わい', description: '짧은 설명 (일본어, 500자 이내)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescriptionJa?: string;

  @ApiPropertyOptional({ example: '口感顺滑', description: '짧은 설명 (중문, 500자 이내)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescriptionZh?: string;

  @ApiPropertyOptional({ example: '주니', description: '니료 종류' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  clayType?: string;

  @ApiPropertyOptional({ example: '서시', description: '자사호 모양' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  teapotShape?: string;

  @ApiPropertyOptional({ type: [ProductImageInputDto], description: '갤러리 이미지 목록' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductDetailImageInputDto], description: '상품 상세 이미지 목록' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDetailImageInputDto)
  detailImages?: ProductDetailImageInputDto[];
}
