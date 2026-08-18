import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from '../../orders/dto/create-order.dto';

export class CheckoutPricingPreviewDto {
  @ApiProperty({ type: [OrderItemDto], description: '가격 미리보기 대상 상품 목록' })
  @IsArray({ message: '주문 상품 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ example: '12345', description: '배송지 우편번호' })
  @IsString({ message: '우편번호를 입력해 주세요.' })
  @MaxLength(10, { message: '우편번호는 최대 10자까지 입력 가능합니다.' })
  zipcode!: string;

  @ApiPropertyOptional({ example: 1, description: '적용할 사용자 쿠폰 ID' })
  @IsOptional()
  @IsInt({ message: '쿠폰 ID는 정수여야 합니다.' })
  userCouponId?: number;

  @ApiPropertyOptional({ example: 1000, description: '사용 요청 포인트' })
  @IsOptional()
  @IsInt({ message: '포인트 사용량은 정수여야 합니다.' })
  @Min(0, { message: '포인트 사용량은 0 이상이어야 합니다.' })
  pointsToUse?: number;

  @ApiPropertyOptional({ example: 'ko', enum: ['ko', 'en'], description: '호출 시점 로케일' })
  @IsOptional()
  @IsIn(['ko', 'en'], { message: '로케일은 ko 또는 en 이어야 합니다.' })
  locale?: 'ko' | 'en';
}

export class CheckoutPricingPreviewResponse {
  @ApiProperty({ type: 'array', description: '서버 가격 기준 상품별 금액' })
  items!: Array<{
    productId: number;
    productOptionId: number | null;
    productName: string;
    optionName: string | null;
    unitPrice: number;
    subtotal: number;
    quantity: number;
  }>;

  @ApiProperty({ example: 50000, description: '할인 전 상품 합계' })
  subtotalAmount!: number;

  @ApiProperty({ example: 5000, description: '쿠폰 할인 금액' })
  couponDiscount!: number;

  @ApiProperty({ example: 3000, description: '포인트 할인 금액' })
  pointsDiscount!: number;

  @ApiProperty({ example: 0, description: '최종 배송비' })
  shippingFee!: number;

  @ApiProperty({ example: true, description: '무료배송 여부' })
  isFreeShipping!: boolean;

  @ApiProperty({ example: false, description: '도서산간 여부' })
  isRemoteArea!: boolean;

  @ApiProperty({ example: 3000, description: '도서산간 추가 배송비' })
  remoteAreaSurcharge!: number;

  @ApiProperty({ example: 42000, description: '최종 결제 금액' })
  totalPayable!: number;

  @ApiPropertyOptional({ example: 1, description: '실제 적용된 사용자 쿠폰 ID' })
  appliedUserCouponId?: number;

  @ApiProperty({ example: 3000, description: '실제 반영된 포인트 사용량' })
  appliedPointsUsed!: number;

  @ApiProperty({ example: 50000, description: '무료배송 임계 금액' })
  freeShippingThreshold!: number;
}
