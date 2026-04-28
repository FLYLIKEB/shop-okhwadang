import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

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
}
