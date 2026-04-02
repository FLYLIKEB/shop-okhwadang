import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

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
}
