import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { DefaultPaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminMembersQueryDto extends DefaultPaginationQueryDto {
  @ApiProperty({ example: '홍길동', description: '검색어 (이름 또는 이메일)', required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin', 'super_admin'], description: '역할', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['user', 'admin', 'super_admin'])
  role?: string;

  @ApiProperty({ example: true, description: '활성 상태만 조회', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
