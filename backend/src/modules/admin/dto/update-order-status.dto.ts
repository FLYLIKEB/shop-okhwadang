import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status!: string;
}
