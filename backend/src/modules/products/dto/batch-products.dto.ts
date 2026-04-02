import { IsArray, IsNumber, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BatchProductsDto {
  @ApiProperty({ example: [1, 2, 3], description: '조회할 상품 ID 목록 (최대 50개)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  ids!: number[];
}
