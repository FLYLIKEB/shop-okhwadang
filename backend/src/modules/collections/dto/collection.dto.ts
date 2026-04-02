import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { CollectionType } from '../entities/collection.entity';

export class CreateCollectionDto {
  @ApiProperty({ example: 'clay', enum: ['clay', 'shape'], description: '컬렉션 유형' })
  @IsEnum(CollectionType)
  type!: CollectionType;

  @ApiProperty({ example: 'Summer Collection', description: '컬렉션 이름' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '여름 컬렉션', description: '컬렉션 이름 (한국어)', required: false })
  @IsOptional()
  @IsString()
  nameKo?: string;

  @ApiProperty({ example: '#FF6B6B', description: '컬렉션 색상', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'Discover our summer teas', description: '컬렉션 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/collection.jpg', description: '컬렉션 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '/products?collection=summer', description: '상품 목록 URL' })
  @IsString()
  productUrl!: string;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCollectionDto {
  @ApiProperty({ example: 'clay', enum: ['clay', 'shape'], description: '컬렉션 유형', required: false })
  @IsOptional()
  @IsEnum(CollectionType)
  type?: CollectionType;

  @ApiProperty({ example: 'Summer Collection', description: '컬렉션 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '여름 컬렉션', description: '컬렉션 이름 (한국어)', required: false })
  @IsOptional()
  @IsString()
  nameKo?: string;

  @ApiProperty({ example: '#FF6B6B', description: '컬렉션 색상', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'Discover our summer teas', description: '컬렉션 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/collection.jpg', description: '컬렉션 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '/products?collection=summer', description: '상품 목록 URL', required: false })
  @IsOptional()
  @IsString()
  productUrl?: string;

  @ApiProperty({ example: 1, description: '정렬 순서', required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
