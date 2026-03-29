import { IsNumber, Min } from 'class-validator';

export class IssueCouponDto {
  @IsNumber()
  @Min(1)
  couponId!: number;

  @IsNumber()
  @Min(1)
  userId!: number;
}
