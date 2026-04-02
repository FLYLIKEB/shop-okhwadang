import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class FaqQueryDto {
  @ApiProperty({ example: '주문/배송', description: '카테고리', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'ko', description: '언어', required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}
