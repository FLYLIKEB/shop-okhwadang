import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BlockOrderItemDto {
  @ApiProperty({ example: 1, description: '블록 ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0, description: '정렬 순서' })
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderBlocksDto {
  @ApiProperty({ type: [BlockOrderItemDto], description: '블록 정렬 순서 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockOrderItemDto)
  orders!: BlockOrderItemDto[];
}
