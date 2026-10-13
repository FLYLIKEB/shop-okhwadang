import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export const DASHBOARD_PERIODS = ['today', '7d', '30d', '90d'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export class DashboardQueryDto {
  @ApiProperty({ example: '2024-01-01', description: '시작 날짜', required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '시작 날짜는 YYYY-MM-DD 형식이어야 합니다' })
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', description: '종료 날짜', required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '종료 날짜는 YYYY-MM-DD 형식이어야 합니다' })
  endDate?: string;

  @ApiProperty({ example: '30d', enum: DASHBOARD_PERIODS, description: '기간 단위 (today, 7d, 30d, 90d)', required: false })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriod;
}
