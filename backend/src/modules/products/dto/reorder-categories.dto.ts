import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryOrderItem {
  @ApiProperty({ example: 1, description: '카테고리 ID' })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 0, description: '정렬 순서' })
  @IsNumber()
  @Min(0)
  sortOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [CategoryOrderItem], description: '카테고리 정렬 순서 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  orders!: CategoryOrderItem[];
}
