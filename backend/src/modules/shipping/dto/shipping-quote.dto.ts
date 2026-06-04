import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateIf, ValidateNested } from 'class-validator';

export class ShippingQuoteItemDto {
  @ApiProperty({ example: 1, description: '상품 ID' })
  @IsInt({ message: '상품 ID는 정수여야 합니다.' })
  productId!: number;

  @ApiPropertyOptional({ example: null, description: '상품 옵션 ID' })
  @IsOptional()
  @ValidateIf((o: ShippingQuoteItemDto) => o.productOptionId !== null)
  @IsInt({ message: '상품 옵션 ID는 정수여야 합니다.' })
  productOptionId?: number | null;

  @ApiProperty({ example: 2, description: '수량' })
  @IsInt({ message: '수량은 정수여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  quantity!: number;
}

export class ShippingQuoteDto {
  @ApiProperty({ example: 42000, description: '상품 소계 금액(원)' })
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiProperty({ example: '63124', description: '배송지 우편번호' })
  @IsString()
  @Length(3, 10)
  zipcode!: string;

  @ApiPropertyOptional({ type: [ShippingQuoteItemDto], description: '서버 기준 배송비 계산용 상품 목록' })
  @IsOptional()
  @IsArray({ message: '상품 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => ShippingQuoteItemDto)
  items?: ShippingQuoteItemDto[];
}
