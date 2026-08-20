import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DefaultPaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminCouponListQueryDto extends DefaultPaginationQueryDto {
  @ApiPropertyOptional({ example: 'WELCOME', description: '쿠폰 코드/이름 검색어' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'active', description: '쿠폰 활성 상태 필터', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
