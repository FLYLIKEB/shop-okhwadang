import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: '보이차', description: '카테고리 이름' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'boheicha', description: 'URL 슬러그 (영문 소문자, 숫자, 하이픈)' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug는 영문 소문자, 숫자, 하이픈만 허용됩니다.' })
  slug!: string;

  @ApiProperty({ example: null, description: '부모 카테고리 ID', required: false })
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'https://example.com/category.jpg', description: '카테고리 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;
}
