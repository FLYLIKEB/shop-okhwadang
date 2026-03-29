import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @IsInt()
  orderId!: number;

  @IsString()
  @IsNotEmpty()
  paymentKey!: string;

  @IsInt()
  amount!: number;
}
