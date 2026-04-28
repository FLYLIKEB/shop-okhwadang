import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NavigationOrderItemDto {
  @ApiProperty({ example: 1, description: '네비게이션 아이템 ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0, description: '정렬 순서' })
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderNavigationDto {
  @ApiProperty({ type: [NavigationOrderItemDto], description: '네비게이션 정렬 순서 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavigationOrderItemDto)
  orders!: NavigationOrderItemDto[];
}
