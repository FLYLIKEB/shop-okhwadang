import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsBoolean, IsObject, Min, ValidateIf } from 'class-validator';
import { CouponRuleTrigger } from '../entities/coupon-rule.entity';

export class UpdateCouponRuleDto {
  @ApiProperty({
    example: 'signup',
    enum: CouponRuleTrigger,
    required: false,
  })
  @IsEnum(CouponRuleTrigger)
  @IsOptional()
  trigger?: CouponRuleTrigger;

  @ApiProperty({ example: 1, description: '쿠폰 템플릿 ID', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  couponTemplateId?: number;

  @ApiProperty({ example: { minTier: 'Silver' }, required: false })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsObject()
  @IsOptional()
  conditionsJson?: Record<string, unknown> | null;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
