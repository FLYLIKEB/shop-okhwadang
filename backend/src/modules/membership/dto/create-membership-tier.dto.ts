import { IsString, IsNumber, IsOptional, IsObject, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMembershipTierDto {
  @ApiProperty({ description: '등급명 (예: Bronze, Silver, Gold, VIP)', example: 'Gold' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: '최소 누적 구매 금액', example: 700000 })
  @IsNumber()
  @Min(0)
  minAmount!: number;

  @ApiProperty({ description: '포인트 적립률 (%)', example: 2.0 })
  @IsNumber()
  @Min(0)
  pointRate!: number;

  @ApiPropertyOptional({ description: '혜택 JSON', example: { description: '골드 회원', welcomeCoupon: true } })
  @IsOptional()
  @IsObject()
  benefitsJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: '정렬 순서', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
