import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class ExportQueryDto {
  @ApiProperty({
    example: 'csv',
    enum: ['csv', 'xlsx'],
    description: '내보내기 형식',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx' = 'csv';

  @ApiProperty({ example: '2024-01-01', description: '시작 날짜', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ example: '2024-12-31', description: '종료 날짜', required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ example: 'true', description: '개인정보 마스킹 여부', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  mask?: string;

  @ApiProperty({ example: '월말 정산 검증', description: '다운로드 사유(감사 로그 기록용)', required: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}
