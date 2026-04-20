import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsString, MaxLength, Min, IsArray, IsOptional,
} from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ example: 15000, description: '환불 금액 (원)' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: '고객 변심', description: '환불 사유 (최대 500자)' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    example: [1, 2],
    description: '환불 대상 주문 항목 ID 목록 (null이면 전체)',
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  orderItemIds?: number[];
}
