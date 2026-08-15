import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt, IsString, MaxLength, Min, Matches,
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

  @ApiProperty({
    example: '9cf2d0e1-5dde-4bf9-88a8-e4b991d4ccbd',
    description: '클라이언트가 재시도마다 동일하게 제공하는 환불 작업 키',
  })
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: '환불 작업 키 형식이 올바르지 않습니다.' })
  idempotencyKey?: string;
}
