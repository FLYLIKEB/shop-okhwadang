import { IsInt, IsOptional, IsString } from 'class-validator';

export class PreparePaymentDto {
  @IsInt()
  orderId!: number;

  @IsOptional()
  @IsString()
  locale?: string;
}
