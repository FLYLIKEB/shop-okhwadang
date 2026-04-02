import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: '상품 ID' })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: null, description: '상품 옵션 ID', required: false })
  @IsOptional()
  @ValidateIf((o: AddToCartDto) => o.productOptionId !== null)
  @IsInt()
  productOptionId?: number | null;

  @ApiProperty({ example: 1, description: '수량' })
  @IsInt()
  @Min(1)
  quantity!: number;
}
