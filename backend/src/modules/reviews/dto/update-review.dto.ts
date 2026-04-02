import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, IsArray, ArrayMaxSize } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ example: 4, description: '별점 (1-5)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: '수정된 리뷰 내용입니다.', description: '리뷰 내용', required: false })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ example: ['https://example.com/review1.jpg'], description: '리뷰 이미지 URL 목록', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];
}
