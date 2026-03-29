import { IsInt } from 'class-validator';

export class CreateWishlistDto {
  @IsInt()
  productId!: number;
}
