import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
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

  @ApiPropertyOptional({
    maxLength: 200,
    description: '메시지, 트랜잭션 ID, 요청 ID 등에서 찾을 검색어',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: '조회 시작 시간(ISO 8601)',
    example: '2026-07-07T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({
    description: '조회 종료 시간(ISO 8601)',
    example: '2026-07-07T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
