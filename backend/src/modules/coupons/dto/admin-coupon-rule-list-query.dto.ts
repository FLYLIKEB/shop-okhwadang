import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminCouponRuleListQueryDto {
  @ApiPropertyOptional({ example: 1, description: '페이지 번호' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: '페이지당 개수' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit은 100 이하여야 합니다.' })
  limit?: number = 20;
}
