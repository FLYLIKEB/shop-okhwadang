import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({ example: 1, description: '주문 ID' })
  @IsInt({ message: '주문 ID는 정수여야 합니다.' })
  orderId!: number;

  @ApiProperty({ example: 'payment_key_from_toss', description: '결제 키' })
  @IsString({ message: '결제 키를 입력해 주세요.' })
  @IsNotEmpty({ message: '결제 키를 입력해 주세요.' })
  paymentKey!: string;

  @ApiProperty({ example: 35000, description: '결제 금액' })
  @IsInt({ message: '결제 금액은 정수여야 합니다.' })
  amount!: number;
}
