import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

const MANUAL_POINT_REASON_MAX_LENGTH = 230;

export class ManualPointAdjustmentDto {
  @ApiProperty({ example: 42, description: '조정 대상 사용자 ID' })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: 1000, description: '조정 포인트 변화량. 양수는 적립, 음수는 차감' })
  @IsInt()
  @Min(-2147483648)
  @Max(2147483647)
  delta!: number;

  @ApiProperty({ example: 'CS 보상 지급', description: '조정 사유' })
  @IsString()
  @MaxLength(MANUAL_POINT_REASON_MAX_LENGTH)
  reason!: string;
}
