import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  @ApiProperty({ example: 1, description: 'ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0, description: '정렬 순서' })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderItemsDto {
  @ApiProperty({ type: [ReorderItemDto], description: '정렬 순서 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  orders!: ReorderItemDto[];
}