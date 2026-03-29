import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { PromotionType } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['timesale', 'exhibition', 'event'])
  type!: PromotionType;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountRate?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}

export class UpdatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['timesale', 'exhibition', 'event'])
  @IsOptional()
  type?: PromotionType;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountRate?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
