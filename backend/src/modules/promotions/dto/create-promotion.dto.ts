import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: '여름 타임세일', description: '프로모션 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '여름 한정 특별 할인', description: '프로모션 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'timesale', enum: ['timesale', 'exhibition', 'event'], description: '프로모션 유형' })
  @IsEnum(['timesale', 'exhibition', 'event'])
  type!: PromotionType;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '시작 일시' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2024-08-31T23:59:59.999Z', description: '종료 일시' })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 20, description: '할인율 (%)', required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountRate?: number;

  @ApiProperty({ example: 'https://example.com/promotion.jpg', description: '프로모션 이미지 URL', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}

export class UpdatePromotionDto {
  @ApiProperty({ example: '여름 타임세일 (연장)', description: '프로모션 제목', required: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiProperty({ example: '여름 한정 특별 할인 (연장)', description: '프로모션 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'timesale', enum: ['timesale', 'exhibition', 'event'], description: '프로모션 유형', required: false })
  @IsEnum(['timesale', 'exhibition', 'event'])
  @IsOptional()
  type?: PromotionType;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '시작 일시', required: false })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiProperty({ example: '2024-09-30T23:59:59.999Z', description: '종료 일시', required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 25, description: '할인율 (%)', required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountRate?: number;

  @ApiProperty({ example: 'https://example.com/promotion2.jpg', description: '프로모션 이미지 URL', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
