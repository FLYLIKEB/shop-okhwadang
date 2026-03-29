import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePageDto {
  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
