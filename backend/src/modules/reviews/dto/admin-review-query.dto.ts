import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DefaultPaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export type AdminReviewVisibilityFilter = 'all' | 'visible' | 'hidden';
export type AdminReviewSort = 'reviewedAt' | 'rating' | 'helpful' | 'importedAt';

export class AdminReviewQueryDto extends DefaultPaginationQueryDto {
  @ApiPropertyOptional({
    example: '연자호',
    description: '상품명/상품번호/리뷰글번호/등록자/본문 검색어',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'visible', 'hidden'], description: '노출 상태 필터' })
  @IsOptional()
  @IsIn(['all', 'visible', 'hidden'])
  visibility?: AdminReviewVisibilityFilter;

  @ApiPropertyOptional({ example: 5, description: '평점 필터' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: '일반', description: '리뷰구분 필터' })
  @IsOptional()
  @IsString()
  reviewType?: string;

  @ApiPropertyOptional({ example: true, description: '포토/영상 여부 필터' })
  @IsOptional()
  @IsBooleanString()
  hasMedia?: string;

  @ApiPropertyOptional({ example: 'naver-review-20260703-abc123', description: '업로드 배치 ID' })
  @IsOptional()
  @IsString()
  importBatchId?: string;

  @ApiPropertyOptional({
    enum: ['reviewedAt', 'rating', 'helpful', 'importedAt'],
    description: '정렬 기준',
  })
  @IsOptional()
  @IsIn(['reviewedAt', 'rating', 'helpful', 'importedAt'])
  sort?: AdminReviewSort;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: '정렬 방향' })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
