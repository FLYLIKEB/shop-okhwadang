import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsIn, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewQueryDto {
  @ApiProperty({ example: 1, description: '상품 ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiProperty({ example: 'recent', enum: ['recent', 'rating_high', 'rating_low'], description: '정렬 방식', required: false })
  @IsOptional()
  @IsIn(['recent', 'rating_high', 'rating_low'])
  sort?: 'recent' | 'rating_high' | 'rating_low';

  @ApiProperty({ example: 1, description: '페이지 번호', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ example: 10, description: '페이지당 개수', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit은 100 이하여야 합니다.' })
  limit?: number;
}
