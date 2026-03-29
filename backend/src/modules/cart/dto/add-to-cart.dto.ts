import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  productId!: number;

  @IsOptional()
  @ValidateIf((o: AddToCartDto) => o.productOptionId !== null)
  @IsInt()
  productOptionId?: number | null;

  @IsInt()
  @Min(1)
  quantity!: number;
}
