import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPaymentDto {
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @IsOptional()
  @IsString({ message: '취소 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '취소 사유는 최대 500자까지 입력 가능합니다.' })
  reason?: string;
}
