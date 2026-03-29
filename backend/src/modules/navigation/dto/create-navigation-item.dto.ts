import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateNavigationItemDto {
  @IsEnum(['gnb', 'sidebar', 'footer'])
  group!: 'gnb' | 'sidebar' | 'footer';

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsString()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  parent_id?: number | null;
}
