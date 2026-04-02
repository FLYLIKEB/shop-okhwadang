import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'about-us', description: 'URL 슬러그' })
  @IsString()
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: '关于我们', description: '페이지 제목' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'default', description: '템플릿', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @ApiProperty({ example: true, description: '발행 여부', required: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
