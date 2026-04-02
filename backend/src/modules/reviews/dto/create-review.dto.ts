import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 1, description: '상품 ID' })
  @IsInt({ message: '상품 ID는 정수여야 합니다.' })
  productId!: number;

  @ApiProperty({ example: 1, description: '주문 상품 ID' })
  @IsInt({ message: '주문 상품 ID는 정수여야 합니다.' })
  orderItemId!: number;

  @ApiProperty({ example: 5, description: '별점 (1-5)' })
  @IsInt({ message: '별점은 정수여야 합니다.' })
  @Min(1, { message: '별점은 최소 1점 이상이어야 합니다.' })
  @Max(5, { message: '별점은 최대 5점까지 입력 가능합니다.' })
  rating!: number;

  @ApiProperty({ example: '정말 맛있게 먹었습니다. 강추합니다!', description: '리뷰 내용', required: false })
  @IsOptional()
  @IsString({ message: '리뷰 내용은 문자열이어야 합니다.' })
  content?: string | null;

  @ApiProperty({ example: ['https://example.com/review1.jpg'], description: '리뷰 이미지 URL 목록', required: false })
  @IsOptional()
  @IsArray({ message: '이미지 URL 목록은 배열이어야 합니다.' })
  @ArrayMaxSize(5, { message: '이미지는 최대 5개까지 첨부 가능합니다.' })
  @IsString({ each: true, message: '이미지 URL은 문자열이어야 합니다.' })
  imageUrls?: string[];
}
