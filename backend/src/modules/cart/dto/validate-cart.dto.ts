import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class ValidateCartDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: '검증할 장바구니 아이템 ID 목록',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds!: number[];
}

export type CartIssueType = 'out_of_stock' | 'discontinued' | 'price_changed';

export class CartItemValidationResultDto {
  @ApiProperty({ example: 1, description: '장바구니 아이템 ID' })
  itemId!: number;

  @ApiProperty({ example: true, description: '구매 가능 여부' })
  available!: boolean;

  @ApiProperty({ example: 25000, description: '현재 단가 (원)' })
  unitPrice!: number;

  @ApiProperty({ example: 10, description: '현재 재고 수량' })
  stock!: number;

  @ApiProperty({
    example: ['price_changed'],
    description: '문제 유형 목록',
    enum: ['out_of_stock', 'discontinued', 'price_changed'],
    isArray: true,
  })
  issues!: CartIssueType[];
}

export class ValidateCartResponseDto {
  @ApiProperty({ type: [CartItemValidationResultDto] })
  results!: CartItemValidationResultDto[];
}
