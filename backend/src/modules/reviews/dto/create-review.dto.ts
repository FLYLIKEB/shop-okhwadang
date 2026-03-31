import { IsInt, IsOptional, IsString, Max, Min, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateReviewDto {
  @IsInt({ message: '상품 ID는 정수여야 합니다.' })
  productId!: number;

  @IsInt({ message: '주문 상품 ID는 정수여야 합니다.' })
  orderItemId!: number;

  @IsInt({ message: '별점은 정수여야 합니다.' })
  @Min(1, { message: '별점은 최소 1점 이상이어야 합니다.' })
  @Max(5, { message: '별점은 최대 5점까지 입력 가능합니다.' })
  rating!: number;

  @IsOptional()
  @IsString({ message: '리뷰 내용은 문자열이어야 합니다.' })
  content?: string | null;

  @IsOptional()
  @IsArray({ message: '이미지 URL 목록은 배열이어야 합니다.' })
  @ArrayMaxSize(5, { message: '이미지는 최대 5개까지 첨부 가능합니다.' })
  @IsString({ each: true, message: '이미지 URL은 문자열이어야 합니다.' })
  imageUrls?: string[];
}
