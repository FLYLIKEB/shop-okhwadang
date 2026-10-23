import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, Matches, IsString, IsNumber, IsInt, IsOptional, IsBoolean, IsEnum, MaxLength, Min, IsArray, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';
import { ProductImageInputDto, ProductDetailImageInputDto, ProductNoticeInfoDto, ProductOptionInputDto } from './create-product.dto';
import { SetProductAttributeItemDto } from './product-attribute.dto';

export class UpdateProductDto {
  @ApiProperty({ example: 1, description: '카테고리 ID', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @ApiProperty({ example: '옥화당 보이차', description: '상품명', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'okhwadang-boheicha', description: 'URL 슬러그', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: '신선한 원두를 사용하여 만든 전통 방식의 보이차...', description: '상품 상세 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '부드러운 맛과 깊은 향', description: '짧은 설명', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string | null;

  @ApiProperty({ example: 35000, description: '가격 (원)', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiProperty({ example: 30000, description: '할인가 (원)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiProperty({ example: 100, description: '재고 수량', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 'OCH-001', description: 'SKU 코드', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, description: '상품 상태', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ example: true, description: '추천 상품 여부', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: false, description: '상품별 무료배송 여부', required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isFreeShipping?: boolean;

  @ApiPropertyOptional({ example: false, description: '예약구매 상품 여부' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean({ message: '예약구매 여부는 불리언이어야 합니다.' })
  isPreOrder?: boolean;

  @ApiPropertyOptional({ example: '2026-12-01', nullable: true, description: '예약구매 발송 예정일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({ strict: true }, { message: '유효한 발송 예정일을 입력해 주세요.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '발송 예정일은 YYYY-MM-DD 형식이어야 합니다.' })
  preOrderShippingDate?: string | null;

  @ApiPropertyOptional({ example: true, description: '한국어 페이지 노출 여부' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isVisibleKo?: boolean;

  @ApiPropertyOptional({ example: false, description: '영어 페이지 노출 여부' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isVisibleEn?: boolean;

  @ApiPropertyOptional({ example: 'Ockhwadang Pu-erh Tea', description: '상품명 (영문)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string | null;

  @ApiPropertyOptional({ example: 'Traditional pu-erh tea...', description: '상품 상세 설명 (영문)' })
  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  @ApiPropertyOptional({ example: 'Smooth taste and deep aroma', description: '짧은 설명 (영문, 500자 이내)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescriptionEn?: string | null;

  @ApiPropertyOptional({ example: '주니', description: '니료 종류' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  clayType?: string | null;

  @ApiPropertyOptional({ example: '서시', description: '자사호 모양' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  teapotShape?: string | null;

  @ApiPropertyOptional({ type: ProductNoticeInfoDto, description: '상품고시정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductNoticeInfoDto)
  noticeInfo?: ProductNoticeInfoDto | null;

  @ApiPropertyOptional({ type: [ProductImageInputDto], description: '갤러리 이미지 목록' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductDetailImageInputDto], description: '상품 상세 이미지 목록' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDetailImageInputDto)
  detailImages?: ProductDetailImageInputDto[];

  @ApiPropertyOptional({ type: [ProductOptionInputDto], description: '상품 옵션 목록' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionInputDto)
  options?: ProductOptionInputDto[];

  @ApiPropertyOptional({ type: [SetProductAttributeItemDto], description: '상품 속성 목록' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetProductAttributeItemDto)
  attributes?: SetProductAttributeItemDto[];
}
