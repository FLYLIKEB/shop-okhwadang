import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NavigationOrderItemDto {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderNavigationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavigationOrderItemDto)
  orders!: NavigationOrderItemDto[];
}
