import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
  IsDateString,
} from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ example: '여름 특별 할인', description: '배너 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'https://example.com/banner.jpg', description: '배너 이미지 URL' })
  @IsUrl()
  imageUrl!: string;

  @ApiProperty({ example: '/products?promotion=summer', description: '배너 링크 URL', required: false })
  @IsUrl()
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '표시 시작 일시', required: false })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiProperty({ example: '2024-08-31T23:59:59.999Z', description: '표시 종료 일시', required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

export class UpdateBannerDto {
  @ApiProperty({ example: '여름 특별 할인 (수정)', description: '배너 제목', required: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'https://example.com/banner2.jpg', description: '배너 이미지 URL', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: '/products?promotion=summer2', description: '배너 링크 URL', required: false })
  @IsUrl()
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({ example: 1, description: '정렬 순서', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '활성 상태', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z', description: '표시 시작 일시', required: false })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiProperty({ example: '2024-09-30T23:59:59.999Z', description: '표시 종료 일시', required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
