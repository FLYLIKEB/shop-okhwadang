import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { AttributeInputType } from '../entities/attribute-type.entity';

export class CreateAttributeTypeDto {
  @ApiProperty({ example: 'clay_type', description: '고유 코드 (영문, 중복 불가)' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: '니료', description: '속성 이름' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '니료', description: '한국어 이름' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameKo?: string;

  @ApiPropertyOptional({ example: 'Clay Type', description: '영어 이름' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ enum: AttributeInputType, default: AttributeInputType.TEXT, description: '입력 타입' })
  @IsOptional()
  @IsEnum(AttributeInputType)
  inputType?: AttributeInputType;

  @ApiPropertyOptional({ example: true, description: '필터 사용 가능 여부' })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional({ example: false, description: '검색 사용 가능 여부' })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional({ example: ['zhuni', 'zisha', 'duanni'], description: 'select 타입의 허용 값 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  validValues?: string[];

  @ApiPropertyOptional({ example: 0, description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAttributeTypeDto {
  @ApiPropertyOptional({ example: 'clay_type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: '니료' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameKo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ enum: AttributeInputType })
  @IsOptional()
  @IsEnum(AttributeInputType)
  inputType?: AttributeInputType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  validValues?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
