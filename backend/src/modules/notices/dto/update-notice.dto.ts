import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateNoticeDto {
  @ApiProperty({ example: '[안내] 배송 지연 안내', description: '공지 제목', required: false })
  @IsOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: '수정된 공지 내용입니다.', description: '공지 내용', required: false })
  @IsOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: true, description: '상단 고정 여부', required: false })
  @IsOptional()
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiProperty({ example: true, description: '발행 여부', required: false })
  @IsOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
