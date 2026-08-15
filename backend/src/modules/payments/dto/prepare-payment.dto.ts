import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class PreparePaymentDto {
  @ApiProperty({ example: 1, description: '주문 ID' })
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @ApiProperty({ example: 'ko', description: '로케일', required: false })
  @IsOptional()
  @IsString({ message: '로케일은 문자열이어야 합니다.' })
  @IsIn(['ko', 'en'], { message: '로케일은 ko 또는 en만 지원합니다.' })
  locale?: string;

  @ApiPropertyOptional({
    example: 'paypal',
    enum: ['toss', 'bank_transfer', 'eximbay', 'paypal'],
    description: '사용자가 명시적으로 선택한 결제 게이트웨이',
  })
  @IsOptional()
  @IsString({ message: '결제 게이트웨이는 문자열이어야 합니다.' })
  @IsIn(['toss', 'bank_transfer', 'eximbay', 'paypal'], { message: '결제 게이트웨이는 toss, bank_transfer, eximbay 또는 paypal만 지원합니다.' })
  gateway?: 'toss' | 'bank_transfer' | 'eximbay' | 'paypal';
}
