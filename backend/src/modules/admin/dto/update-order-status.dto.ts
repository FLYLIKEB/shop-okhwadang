import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'paid', enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'], description: '주문 상태' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'])
  status!: string;
}
