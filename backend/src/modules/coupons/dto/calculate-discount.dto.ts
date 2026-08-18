import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';

export class CouponShippingItemDto {
  @ApiProperty({ example: 10, description: '상품 ID' })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiPropertyOptional({ example: 2, description: '상품 옵션 ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  productOptionId?: number | null;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CalculateDiscountDto {
  @ApiProperty({ example: 50000, description: '할인 전 상품 합계. 무료배송 기준도 이 금액을 사용합니다.' })
  @IsNumber()
  @Min(0)
  orderAmount!: number;

  @ApiProperty({ example: '12345', description: '배송지 우편번호' })
  @IsString()
  @Matches(/^\d{5}$/)
  zipcode!: string;

  @ApiProperty({ type: [CouponShippingItemDto], description: '배송비 계산 대상 상품 목록' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CouponShippingItemDto)
  items!: CouponShippingItemDto[];

  @ApiPropertyOptional({ example: 1, description: '사용자 쿠폰 ID' })
  @IsNumber()
  @IsOptional()
  userCouponId?: number;

  @ApiProperty({ example: 1000, description: '사용할 포인트', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsToUse?: number;
}
