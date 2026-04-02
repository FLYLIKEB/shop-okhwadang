import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class PreparePaymentDto {
  @ApiProperty({ example: 1, description: '주문 ID' })
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @ApiProperty({ example: 'ko', description: '로케일', required: false })
  @IsOptional()
  @IsString({ message: '로케일은 문자열이어야 합니다.' })
  locale?: string;
}
