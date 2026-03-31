import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @IsString({ message: '결제 키를 입력해 주세요.' })
  @IsNotEmpty({ message: '결제 키를 입력해 주세요.' })
  paymentKey!: string;

  @IsInt({ message: '결제 금액은 정수여야 합니다.' })
  amount!: number;
}
