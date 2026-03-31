import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateNiloTypeDto {
  @IsString()
  name!: string;

  @IsString()
  nameKo!: string;

  @IsString()
  color!: string;

  @IsString()
  region!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  characteristics!: string[];

  @IsString()
  productUrl!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNiloTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameKo?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characteristics?: string[];

  @IsOptional()
  @IsString()
  productUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProcessStepDto {
  @IsNumber()
  step!: number;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  detail!: string;
}

export class UpdateProcessStepDto {
  @IsOptional()
  @IsNumber()
  step?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  detail?: string;
}

export class CreateArtistDto {
  @IsString()
  name!: string;

  @IsString()
  title!: string;

  @IsString()
  region!: string;

  @IsString()
  story!: string;

  @IsString()
  specialty!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  productUrl!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateArtistDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  story?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  productUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
