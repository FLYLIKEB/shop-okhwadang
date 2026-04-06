import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min, Max, MaxLength, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ProductSort {
  LATEST = 'latest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  POPULAR = 'popular',
  REVIEW_COUNT = 'review_count',
  RATING = 'rating',
}

export class QueryProductsDto {
  @ApiProperty({ example: 1, description: '페이지 번호', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, description: '페이지당 개수', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ example: ProductSort.LATEST, enum: ProductSort, description: '정렬 방식', required: false })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort = ProductSort.LATEST;

  @ApiProperty({ example: 1, description: '카테고리 ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ example: '보이차', description: '검색어', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiProperty({ example: 'active', description: '상품 상태', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: true, description: '추천 상품만 조회', required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: 10000, description: '최소 가격', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiProperty({ example: 50000, description: '최대 가격', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiProperty({ example: '주니', description: '니료 종류 필터', required: false })
  @IsOptional()
  @IsString()
  clayType?: string;

  @ApiProperty({ example: '서시', description: '모양 필터', required: false })
  @IsOptional()
  @IsString()
  teapotShape?: string;

  @ApiProperty({ example: 'ko', description: '언어 (ko, en, ja, zh)', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['ko', 'en', 'ja', 'zh'])
  locale?: string;
}
