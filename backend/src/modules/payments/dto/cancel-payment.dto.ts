import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPaymentDto {
  @IsInt()
  orderId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
