import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsString, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PageDraftBlockDto {
  @ApiProperty()
  @IsInt()
  id!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  type!: string;

  @ApiProperty()
  @IsObject()
  content!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sort_order!: number;

  @ApiProperty()
  @IsBoolean()
  is_visible!: boolean;
}

export class SavePageDraftDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  is_published?: boolean;

  @ApiProperty({ type: [PageDraftBlockDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDraftBlockDto)
  blocks!: PageDraftBlockDto[];
}
