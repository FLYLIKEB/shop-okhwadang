import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { InquiryStatus } from '../entities/inquiry.entity';

export class AdminInquiryQueryDto {
  @ApiPropertyOptional({ description: '문의 상태', enum: InquiryStatus, example: InquiryStatus.PENDING })
  @IsOptional()
  @IsEnum(InquiryStatus, { message: 'status는 pending 또는 answered여야 합니다.' })
  status?: InquiryStatus;

  @ApiPropertyOptional({ description: '페이지 번호', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page는 정수여야 합니다.' })
  @Min(1, { message: 'page는 1 이상이어야 합니다.' })
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit은 정수여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상이어야 합니다.' })
  @Max(100, { message: 'limit은 100 이하여야 합니다.' })
  limit?: number;

  @ApiPropertyOptional({ description: '미확인 답변만 조회 (답변 있음 + 고객 미확인)', example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean({ message: 'unread는 boolean이어야 합니다.' })
  unread?: boolean;
}
