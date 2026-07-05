import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';
import { SetProductAttributeItemDto } from './product-attribute.dto';

export { ProductStatus };

export enum ProductNoticeInfoType {
  TEAWARE = 'teaware',
  TEA = 'tea',
}

export class ProductNoticeInfoDto {
  @ApiPropertyOptional({ example: ProductNoticeInfoType.TEA, enum: ProductNoticeInfoType, description: '고시정보 유형' })
  @IsOptional()
  @IsEnum(ProductNoticeInfoType, { message: '고시정보 유형은 teaware 또는 tea여야 합니다.' })
  type?: ProductNoticeInfoType;

  @ApiPropertyOptional({ example: '옥화당 자사호', description: '품명 및 모델명' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: '자사니', description: '재질' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: '자사호 1점, 보관함 1점', description: '구성품' })
  @IsOptional()
  @IsString()
  components?: string;

  @ApiPropertyOptional({ example: '150ml', description: '크기/용량' })
  @IsOptional()
  @IsString()
  sizeCapacity?: string;

  @ApiPropertyOptional({ example: '옥화당', description: '제조자/수입자' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: '중국', description: '제조국' })
  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @ApiPropertyOptional({ example: '강한 충격을 피해주세요.', description: '취급 시 주의사항' })
  @IsOptional()
  @IsString()
  handlingPrecautions?: string;

  @ApiPropertyOptional({ example: '관련 법 및 소비자분쟁해결기준에 따름', description: '품질보증기준' })
  @IsOptional()
  @IsString()
  warrantyPolicy?: string;

  @ApiPropertyOptional({ example: '고객센터 010-2908-0393', description: 'A/S 책임자와 전화번호' })
  @IsOptional()
  @IsString()
  asContact?: string;

  @ApiPropertyOptional({ example: '침출차', description: '식품 유형' })
  @IsOptional()
  @IsString()
  foodType?: string;

  @ApiPropertyOptional({ example: '옥화당', description: '생산자/수입자' })
  @IsOptional()
  @IsString()
  producer?: string;

  @ApiPropertyOptional({ example: '중국 운남성', description: '원산지' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: '별도 표기', description: '제조연월일' })
  @IsOptional()
  @IsString()
  manufactureDate?: string;

  @ApiPropertyOptional({ example: '별도 표기', description: '소비기한' })
  @IsOptional()
  @IsString()
  expirationDate?: string;

  @ApiPropertyOptional({ example: '직사광선을 피하고 서늘한 곳에 보관', description: '보관방법' })
  @IsOptional()
  @IsString()
  storageMethod?: string;

  @ApiPropertyOptional({ example: '차엽 100%', description: '원재료명' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ example: '010-2908-0393', description: '소비자상담 전화번호' })
  @IsOptional()
  @IsString()
  customerServicePhone?: string;
}

export class ProductImageInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/image.jpg', description: '이미지 URL' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ example: '상품 이미지 설명', description: 'ALT 텍스트' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ example: 0, description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, description: '썸네일 여부' })
  @IsOptional()
  @IsBoolean()
  isThumbnail?: boolean;
}

export class ProductDetailImageInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/detail.jpg', description: '이미지 URL' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ example: '상세 이미지 설명', description: 'ALT 텍스트' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ example: 0, description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ProductOptionInputDto {
  @ApiProperty({ example: '용량', description: '옵션명' })
  @IsString({ message: '옵션명을 입력해 주세요.' })
  @MaxLength(100, { message: '옵션명은 최대 100자까지 입력 가능합니다.' })
  name!: string;

  @ApiProperty({ example: '100cc', description: '옵션값' })
  @IsString({ message: '옵션값을 입력해 주세요.' })
  @MaxLength(100, { message: '옵션값은 최대 100자까지 입력 가능합니다.' })
  value!: string;

  @ApiPropertyOptional({ example: 5000, description: '옵션 가격 조정 (원)' })
  @IsOptional()
  @IsNumber({}, { message: '옵션 가격 조정은 숫자여야 합니다.' })
  priceAdjustment?: number;

  @ApiPropertyOptional({ example: 10, description: '옵션 재고 수량' })
  @IsOptional()
  @IsNumber({}, { message: '옵션 재고는 숫자여야 합니다.' })
  @Min(0, { message: '옵션 재고는 0 이상이어야 합니다.' })
  stock?: number;

  @ApiPropertyOptional({ example: 0, description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

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

  @ApiProperty({ example: false, description: '상품별 무료배송 여부', required: false })
  @IsOptional()
  @IsBoolean({ message: '무료배송 상품 여부는 불리언이어야 합니다.' })
  isFreeShipping?: boolean;

  @ApiPropertyOptional({ example: true, description: '한국어 페이지 노출 여부' })
  @IsOptional()
  @IsBoolean({ message: '한국어 페이지 노출 여부는 불리언이어야 합니다.' })
  isVisibleKo?: boolean;

  @ApiPropertyOptional({ example: false, description: '영어 페이지 노출 여부' })
  @IsOptional()
  @IsBoolean({ message: '영어 페이지 노출 여부는 불리언이어야 합니다.' })
  isVisibleEn?: boolean;

  @ApiPropertyOptional({ example: 'Ockhwadang Pu-erh Tea', description: '상품명 (영문)' })
  @IsOptional()
  @IsString({ message: '영문 상품명은 문자열이어야 합니다.' })
  @MaxLength(255, { message: '영문 상품명은 최대 255자까지 입력 가능합니다.' })
  nameEn?: string;

  @ApiPropertyOptional({ example: 'Traditional pu-erh tea...', description: '상품 상세 설명 (영문)' })
  @IsOptional()
  @IsString({ message: '영문 설명은 문자열이어야 합니다.' })
  descriptionEn?: string;

  @ApiPropertyOptional({ example: 'Smooth taste and deep aroma', description: '짧은 설명 (영문, 500자 이내)' })
  @IsOptional()
  @IsString({ message: '영문 짧은 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '영문 짧은 설명은 최대 500자까지 입력 가능합니다.' })
  shortDescriptionEn?: string;

  @ApiPropertyOptional({ example: '주니', description: '니료 종류' })
  @IsOptional()
  @IsString({ message: '니료 종류는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '니료 종류는 최대 50자까지 입력 가능합니다.' })
  clayType?: string;

  @ApiPropertyOptional({ example: '서시', description: '자사호 모양' })
  @IsOptional()
  @IsString({ message: '모양은 문자열이어야 합니다.' })
  @MaxLength(50, { message: '모양은 최대 50자까지 입력 가능합니다.' })
  teapotShape?: string;

  @ApiPropertyOptional({ type: ProductNoticeInfoDto, description: '상품고시정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductNoticeInfoDto)
  noticeInfo?: ProductNoticeInfoDto;

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

  @ApiPropertyOptional({ type: [ProductOptionInputDto], description: '상품 옵션 목록' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionInputDto)
  options?: ProductOptionInputDto[];

  @ApiPropertyOptional({ type: [SetProductAttributeItemDto], description: '상품 속성 목록' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetProductAttributeItemDto)
  attributes?: SetProductAttributeItemDto[];
}
