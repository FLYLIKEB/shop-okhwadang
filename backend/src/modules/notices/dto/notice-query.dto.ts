import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class NoticeQueryDto {
  @ApiProperty({ example: 'ko', description: '언어', required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}
