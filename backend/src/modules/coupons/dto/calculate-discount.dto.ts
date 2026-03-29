import { IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateDiscountDto {
  @IsNumber()
  @Min(0)
  orderAmount!: number;

  @IsNumber()
  @IsOptional()
  userCouponId?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsToUse?: number;
}
