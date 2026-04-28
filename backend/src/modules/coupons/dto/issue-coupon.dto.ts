import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class IssueCouponDto {
  @ApiProperty({ example: 1, description: '쿠폰 ID' })
  @IsNumber()
  @Min(1)
  couponId!: number;

  @ApiProperty({ example: 1, description: '사용자 ID' })
  @IsNumber()
  @Min(1)
  userId!: number;
}
