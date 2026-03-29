import { IsInt } from 'class-validator';

export class PreparePaymentDto {
  @IsInt()
  orderId!: number;
}
