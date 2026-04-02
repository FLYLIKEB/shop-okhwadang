import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: '[안내] 배송 지연 안내', description: '공지 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '최근 택배 물량 증가로 인해 배송이 1-2일 지연될 수 있습니다.', description: '공지 내용' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: true, description: '상단 고정 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiProperty({ example: true, description: '발행 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
