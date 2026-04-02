import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateWishlistDto {
  @ApiProperty({ example: 1, description: '상품 ID' })
  @IsInt()
  productId!: number;
}
