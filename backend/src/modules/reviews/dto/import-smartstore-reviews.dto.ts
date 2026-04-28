import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SmartStoreReviewImportItemDto {
  @ApiProperty({ example: 'NV-20260428-0001', description: '스마트스토어 리뷰 고유 ID' })
  @IsString()
  externalReviewId!: string;

  @ApiProperty({ example: '8245678901', description: '스마트스토어 상품 ID', required: false })
  @IsOptional()
  @IsString()
  externalProductId?: string | null;

  @ApiProperty({ example: 5, description: '별점 (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: '스마트스토어에서 가져온 후기입니다.', required: false })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ example: ['https://example.com/naver-review.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ example: '김**', description: '이미 마스킹된 작성자명', required: false })
  @IsOptional()
  @IsString()
  reviewerNameMasked?: string;

  @ApiProperty({ example: '2026-04-28T09:00:00+09:00', description: '스마트스토어 작성일시' })
  @IsDateString()
  reviewedAt!: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class ImportSmartStoreReviewsDto {
  @ApiProperty({ example: 1, description: '자사몰 상품 ID' })
  @IsInt()
  productId!: number;

  @ApiProperty({ type: [SmartStoreReviewImportItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SmartStoreReviewImportItemDto)
  reviews!: SmartStoreReviewImportItemDto[];
}
