import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReviewReplyDto {
  @ApiPropertyOptional({ example: '소중한 후기 감사합니다.' })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({ example: '옥화당' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  author?: string;

  @ApiPropertyOptional({ example: 'naver-smartstore' })
  @IsOptional()
  @IsString()
  source?: string;
}
