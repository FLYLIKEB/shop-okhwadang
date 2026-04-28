import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class AnnouncementBarOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderAnnouncementBarsDto {
  @ApiProperty({ type: [AnnouncementBarOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnouncementBarOrderItemDto)
  orders!: AnnouncementBarOrderItemDto[];
}
