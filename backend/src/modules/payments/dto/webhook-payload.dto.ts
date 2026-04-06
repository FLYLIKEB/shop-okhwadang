import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookPayloadDto {
  @ApiPropertyOptional({
    description: '이벤트 유형 (PAYMENT_STATUS_CHANGED 등)',
    example: 'PAYMENT_STATUS_CHANGED',
  })
  @IsOptional()
  @IsString({ message: '이벤트 유형은 문자열이어야 합니다.' })
  eventType?: string;

  @ApiPropertyOptional({
    description: '주문 ID (ordered)',
    example: '20241006000000000',
  })
  @IsOptional()
  @IsString({ message: '주문 ID는 문자열이어야 합니다.' })
  orderId?: string;

  @ApiPropertyOptional({
    description: '결제 상태',
    example: 'DONE',
  })
  @IsOptional()
  @IsString({ message: '결제 상태는 문자열이어야 합니다.' })
  status?: string;

  @ApiPropertyOptional({
    description: '토스 결제 키',
    example: '5tqV9bRs34mXwdkz2oGv6r',
  })
  @IsOptional()
  @IsString({ message: '결제 키는 문자열이어야 합니다.' })
  paymentKey?: string;

  @ApiPropertyOptional({
    description: '결제 금액',
    example: 15000,
  })
  @IsOptional()
  @IsNumber({}, { message: '결제 금액은 숫자여야 합니다.' })
  amount?: number;

  @ApiPropertyOptional({
    description: '결제 수단',
    example: 'CARD',
  })
  @IsOptional()
  @IsString({ message: '결제 수단은 문자열이어야 합니다.' })
  method?: string;
}