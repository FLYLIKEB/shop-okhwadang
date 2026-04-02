import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateNiloTypeDto {
  @ApiProperty({ example: 'Jin', description: ' nilo type 이름 (영문)' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '진', description: 'nilo type 이름 (한국어)' })
  @IsString()
  nameKo!: string;

  @ApiProperty({ example: '#8B4513', description: 'nilo type 색상' })
  @IsString()
  color!: string;

  @ApiProperty({ example: 'Jeju', description: '산지' })
  @IsString()
  region!: string;

  @ApiProperty({ example: 'Traditional hand-made process', description: '설명' })
  @IsString()
  description!: string;

  @ApiProperty({ example: ['smooth', 'sweet', ' floral'], description: '특징 목록' })
  @IsArray()
  @IsString({ each: true })
  characteristics!: string[];

  @ApiProperty({ example: '/products?nilo=jin', description: '관련 상품 URL' })
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

export class UpdateNiloTypeDto {
  @ApiProperty({ example: 'Jin', description: 'nilo type 이름 (영문)', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '진', description: 'nilo type 이름 (한국어)', required: false })
  @IsOptional()
  @IsString()
  nameKo?: string;

  @ApiProperty({ example: '#8B4513', description: 'nilo type 색상', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'Jeju', description: '산지', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 'Traditional hand-made process', description: '설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['smooth', 'sweet', ' floral'], description: '특징 목록', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characteristics?: string[];

  @ApiProperty({ example: '/products?nilo=jin', description: '관련 상품 URL', required: false })
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

export class CreateProcessStepDto {
  @ApiProperty({ example: 1, description: '공정 단계' })
  @IsNumber()
  step!: number;

  @ApiProperty({ example: '잎采摘', description: '공정 제목' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '수확 철에 맞춰 신선한 잎을采摘합니다', description: '공정 설명' })
  @IsString()
  description!: string;

  @ApiProperty({ example: '春季의 아침에 손으로 신선한 찻잎을采摘합니다...', description: '공정 상세 내용' })
  @IsString()
  detail!: string;
}

export class UpdateProcessStepDto {
  @ApiProperty({ example: 1, description: '공정 단계', required: false })
  @IsOptional()
  @IsNumber()
  step?: number;

  @ApiProperty({ example: '잎采摘', description: '공정 제목', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: '수확 철에 맞춰 신선한 잎을采摘합니다', description: '공정 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '春季의 아침에 손으로 신선한 찻잎을采摘합니다...', description: '공정 상세 내용', required: false })
  @IsOptional()
  @IsString()
  detail?: string;
}

export class CreateArtistDto {
  @ApiProperty({ example: 'Kim Young-ha', description: '아티스트 이름' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Master Tea Maker', description: '아티스트 칭호' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Jeju', description: '지역' })
  @IsString()
  region!: string;

  @ApiProperty({ example: '30 years of tea making experience...', description: '아티스트 이야기' })
  @IsString()
  story!: string;

  @ApiProperty({ example: 'Green Tea', description: '전문 분야' })
  @IsString()
  specialty!: string;

  @ApiProperty({ example: 'https://example.com/artist.jpg', description: '아티스트 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '/products?artist=kim-young-ha', description: '관련 상품 URL' })
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

export class UpdateArtistDto {
  @ApiProperty({ example: 'Kim Young-ha', description: '아티스트 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Master Tea Maker', description: '아티스트 칭호', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Jeju', description: '지역', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: '30 years of tea making experience...', description: '아티스트 이야기', required: false })
  @IsOptional()
  @IsString()
  story?: string;

  @ApiProperty({ example: 'Green Tea', description: '전문 분야', required: false })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ example: 'https://example.com/artist.jpg', description: '아티스트 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '/products?artist=kim-young-ha', description: '관련 상품 URL', required: false })
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
