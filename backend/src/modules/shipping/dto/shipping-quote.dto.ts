import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, Length } from 'class-validator';

export class ShippingQuoteDto {
  @ApiProperty({ example: 42000, description: '상품 소계 금액(원)' })
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiProperty({ example: '63124', description: '배송지 우편번호' })
  @IsString()
  @Length(3, 10)
  zipcode!: string;
}
