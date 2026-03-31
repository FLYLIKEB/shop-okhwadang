import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { CollectionType } from '../entities/collection.entity';

export class CreateCollectionDto {
  @IsEnum(CollectionType)
  type!: CollectionType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  nameKo?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

export class UpdateCollectionDto {
  @IsOptional()
  @IsEnum(CollectionType)
  type?: CollectionType;

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
  description?: string;

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
