import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER2024', description: '쿠폰 코드' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: '여름 축하 할인券', description: '쿠폰 이름' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed'], description: '할인 유형' })
  @IsEnum(['percentage', 'fixed'])
  type!: 'percentage' | 'fixed';

  @ApiProperty({ example: 10, description: '할인 값 (퍼센트 또는 고정 금액)' })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ example: 10000, description: '최소 주문 금액', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ example: 5000, description: '최대 할인 금액', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number | null;

  @ApiProperty({ example: 100, description: '총 발급 수량', required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalQuantity?: number | null;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '유효 시작일' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2024-08-31T23:59:59.999Z', description: '만료일' })
  @IsDateString()
  expiresAt!: string;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
