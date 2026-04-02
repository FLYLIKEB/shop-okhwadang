import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateDiscountDto {
  @ApiProperty({ example: 50000, description: '주문 금액' })
  @IsNumber()
  @Min(0)
  orderAmount!: number;

  @ApiProperty({ example: 1, description: '사용자 쿠폰 ID', required: false })
  @IsNumber()
  @IsOptional()
  userCouponId?: number;

  @ApiProperty({ example: 1000, description: '사용할 포인트', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsToUse?: number;
}
