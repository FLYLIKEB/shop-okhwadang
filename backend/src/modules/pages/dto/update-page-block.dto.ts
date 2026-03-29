import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min } from 'class-validator';

export class UpdatePageBlockDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;
}
