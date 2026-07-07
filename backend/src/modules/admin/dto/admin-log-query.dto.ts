import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type AdminLogType = 'normal' | 'error';

export class AdminLogQueryDto {
  @ApiPropertyOptional({
    enum: ['normal', 'error'],
    default: 'normal',
    description: '조회할 PM2 로그 종류',
  })
  @IsOptional()
  @IsIn(['normal', 'error'])
  type?: AdminLogType = 'normal';

  @ApiPropertyOptional({
    minimum: 10,
    maximum: 5000,
    default: 500,
    description: '조회할 최근 로그 줄 수',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  @Max(5000)
  lines?: number = 500;
}
