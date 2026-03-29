import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(['percentage', 'fixed'])
  type!: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number | null;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalQuantity?: number | null;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  expiresAt!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
