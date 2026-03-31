import { IsInt, IsOptional, IsString } from 'class-validator';

export class PreparePaymentDto {
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @IsOptional()
  @IsString({ message: '로케일은 문자열이어야 합니다.' })
  locale?: string;
}
