import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt, IsString, MaxLength, Min,
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
}
