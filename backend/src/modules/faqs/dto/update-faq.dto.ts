import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateFaqDto {
  @ApiProperty({ example: '주문/배송', description: 'FAQ 카테고리', required: false })
  @IsOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: '배송은 얼마나 걸리나요?', description: '질문', required: false })
  @IsOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  question?: string;

  @ApiProperty({ example: '일반적으로 2-3일 이내에 배송됩니다.', description: '답변', required: false })
  @IsOptional()
  @IsString()
  @IsOptional()
  answer?: string;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '게시 여부', required: false })
  @IsOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
