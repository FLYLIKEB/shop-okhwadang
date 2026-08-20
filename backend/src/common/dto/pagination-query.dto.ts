import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const PAGINATION_VALIDATION_MESSAGES = {
  pageIsInt: 'page는 정수여야 합니다.',
  pageMin: 'page는 1 이상이어야 합니다.',
  limitIsInt: 'limit은 정수여야 합니다.',
  limitMin: 'limit은 1 이상이어야 합니다.',
  limitMax: 'limit은 100 이하여야 합니다.',
} as const;

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: DEFAULT_PAGE, default: DEFAULT_PAGE, description: '페이지 번호' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: PAGINATION_VALIDATION_MESSAGES.pageIsInt })
  @Min(1, { message: PAGINATION_VALIDATION_MESSAGES.pageMin })
  page?: number;

  @ApiPropertyOptional({ example: DEFAULT_LIMIT, default: DEFAULT_LIMIT, description: '페이지당 개수' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: PAGINATION_VALIDATION_MESSAGES.limitIsInt })
  @Min(1, { message: PAGINATION_VALIDATION_MESSAGES.limitMin })
  @Max(MAX_LIMIT, { message: PAGINATION_VALIDATION_MESSAGES.limitMax })
  limit?: number;
}

export class DefaultPaginationQueryDto extends PaginationQueryDto {
  page?: number = DEFAULT_PAGE;
  limit?: number = DEFAULT_LIMIT;
}
