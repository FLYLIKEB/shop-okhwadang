import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BlockOrderItemDto {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderBlocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockOrderItemDto)
  orders!: BlockOrderItemDto[];
}
