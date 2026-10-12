import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  MaxLength,
  IsNotEmpty,
  Max,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DECIMAL_14_2_MAX = 999999999999.99;
const DECIMAL_5_2_MAX = 999.99;
const INT32_MAX = 2147483647;
const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateMembershipTierDto {
  @ApiProperty({ description: '등급명 (예: Bronze, Silver, Gold, VIP)', example: 'Gold' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: '최소 누적 구매 금액', example: 700000 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DECIMAL_14_2_MAX)
  minAmount!: number;

  @ApiProperty({ description: '포인트 적립률 (%)', example: 2.0 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DECIMAL_5_2_MAX)
  pointRate!: number;

  @ApiPropertyOptional({ description: '혜택 JSON', example: { description: '골드 회원', welcomeCoupon: true } })
  @IsOptional()
  @IsObject()
  benefitsJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: '정렬 순서', example: 3 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(INT32_MAX)
  sortOrder?: number;
}
