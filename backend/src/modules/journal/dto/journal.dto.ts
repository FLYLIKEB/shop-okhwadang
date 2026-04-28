import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { JournalCategory } from '../entities/journal-entry.entity';

export class CreateJournalDto {
  @ApiProperty({ example: 'junzi-tea-culture', description: 'URL 슬러그' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: '중국차 도자기 문화', description: '제목' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '따뜻한 차 한 잔의 철학', description: '부제목', required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ example: 'CULTURE', description: '카테고리', enum: JournalCategory })
  @IsEnum(JournalCategory)
  category!: JournalCategory;

  @ApiProperty({ example: '2024-01-15', description: '게시 날짜' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '5분', description: '읽는 시간', required: false })
  @IsOptional()
  @IsString()
  readTime?: string;

  @ApiProperty({ example: '중국 차 도자기는 수천 년의 역사를 가지고 있습니다...', description: '요약', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: ['첫 번째 단락...', '두 번째 단락...'], description: '본문 내용 (JSON 배열)', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: '커버 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ example: true, description: '공개 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateJournalDto extends PartialType(CreateJournalDto) {}
