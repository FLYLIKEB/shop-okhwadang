import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePageDto {
  @ApiProperty({ example: 'about-us', description: 'URL 슬러그', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ example: '关于我们', description: '페이지 제목', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ example: 'default', description: '템플릿', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @ApiProperty({ example: true, description: '발행 여부', required: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiProperty({ example: 'v1.0', description: '정책 문서 버전', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyVersion?: string;

  @ApiProperty({ example: '2026-04-20', description: '정책 시행일', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  policyEffectiveDate?: string;

  @ApiProperty({ example: '최초 제정', description: '정책 변경 이력 요약', required: false })
  @IsOptional()
  @IsString()
  policyChangeSummary?: string;

  @ApiProperty({ example: true, description: '현재 적용 정책 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isCurrentPolicy?: boolean;
}
