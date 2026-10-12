import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  IsInt,
  ValidateIf,
} from 'class-validator';

const DECIMAL_12_2_MAX = 9999999999.99;
const INT32_MAX = 2147483647;
const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER2024', description: '쿠폰 코드' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: '여름 축하 할인券', description: '쿠폰 이름' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed'], description: '할인 유형' })
  @IsEnum(['percentage', 'fixed'])
  type!: 'percentage' | 'fixed';

  @ApiProperty({ example: 10, description: '할인 값 (퍼센트 또는 고정 금액)' })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(DECIMAL_12_2_MAX)
  value!: number;

  @ApiProperty({ example: 10000, description: '최소 주문 금액', required: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DECIMAL_12_2_MAX)
  minOrderAmount?: number;

  @ApiProperty({ example: 5000, description: '최대 할인 금액', required: false })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DECIMAL_12_2_MAX)
  @IsOptional()
  maxDiscount?: number | null;

  @ApiProperty({ example: 100, description: '총 발급 수량', required: false })
  @IsInt()
  @Min(1)
  @Max(INT32_MAX)
  @IsOptional()
  totalQuantity?: number | null;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '유효 시작일' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2024-08-31T23:59:59.999Z', description: '만료일' })
  @IsDateString()
  expiresAt!: string;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
