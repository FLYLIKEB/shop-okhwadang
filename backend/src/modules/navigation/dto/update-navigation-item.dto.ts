import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateNavigationItemDto {
  @ApiProperty({ example: 'gnb', enum: ['gnb', 'sidebar', 'footer'], description: '네비게이션 그룹', required: false })
  @IsOptional()
  @IsEnum(['gnb', 'sidebar', 'footer'])
  group?: 'gnb' | 'sidebar' | 'footer';

  @ApiProperty({ example: '제품', description: '메뉴 레이블', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiProperty({ example: '/products', description: '링크 URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiProperty({ example: 1, description: '정렬 순서', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: null, description: '부모 메뉴 ID', required: false })
  @IsOptional()
  @IsInt()
  parent_id?: number | null;
}
