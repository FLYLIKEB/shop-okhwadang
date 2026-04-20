import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsBoolean, IsObject, Min } from 'class-validator';
import { CouponRuleTrigger } from '../entities/coupon-rule.entity';

export class CreateCouponRuleDto {
  @ApiProperty({
    example: 'signup',
    enum: CouponRuleTrigger,
    description: '트리거 종류 (signup, first_purchase, birthday, tier_up)',
  })
  @IsEnum(CouponRuleTrigger)
  trigger!: CouponRuleTrigger;

  @ApiProperty({ example: 1, description: '쿠폰 템플릿 ID (coupons 테이블)' })
  @IsNumber()
  @Min(1)
  couponTemplateId!: number;

  @ApiProperty({
    example: { minTier: 'Silver' },
    description: '조건 JSON (tier_up 시 minTier 등)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  conditionsJson?: Record<string, unknown> | null;

  @ApiProperty({ example: true, description: '활성 여부', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
