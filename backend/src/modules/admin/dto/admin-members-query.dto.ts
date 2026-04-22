import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Max, Min, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AdminMembersQueryDto {
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

  @ApiProperty({ example: 1, description: '페이지 번호', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, description: '페이지당 개수', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit은 100 이하여야 합니다.' })
  limit?: number = 20;
}
