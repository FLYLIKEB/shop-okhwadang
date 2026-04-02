import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, MaxLength, Min } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ example: '주문/배송', description: 'FAQ 카테고리' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @ApiProperty({ example: '배송은 얼마나 걸리나요?', description: '질문' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question!: string;

  @ApiProperty({ example: '일반적으로 2-3일 이내에 배송됩니다.', description: '답변' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ example: true, description: '게시 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
