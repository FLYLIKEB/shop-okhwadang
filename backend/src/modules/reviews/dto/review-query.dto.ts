import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ReviewQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 1, description: '페이지 번호', required: false })
  declare page?: number;

  @ApiProperty({ example: 10, description: '페이지당 개수', required: false })
  declare limit?: number;

  @ApiProperty({ example: 1, description: '상품 ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiProperty({ example: 'recent', enum: ['recent', 'rating_high', 'rating_low'], description: '정렬 방식', required: false })
  @IsOptional()
  @IsIn(['recent', 'rating_high', 'rating_low'])
  sort?: 'recent' | 'rating_high' | 'rating_low';
}
