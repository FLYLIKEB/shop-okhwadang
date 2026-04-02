import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPaymentDto {
  @ApiProperty({ example: 1, description: '주문 ID' })
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @ApiProperty({ example: '변심으로 인한 취소', description: '취소 사유', required: false })
  @IsOptional()
  @IsString({ message: '취소 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '취소 사유는 최대 500자까지 입력 가능합니다.' })
  reason?: string;
}
