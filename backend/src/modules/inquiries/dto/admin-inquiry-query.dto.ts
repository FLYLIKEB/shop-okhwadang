import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { DefaultPaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InquiryStatus } from '../entities/inquiry.entity';

export class AdminInquiryQueryDto extends DefaultPaginationQueryDto {
  @ApiPropertyOptional({ description: '문의 상태', enum: InquiryStatus, example: InquiryStatus.PENDING })
  @IsOptional()
  @IsEnum(InquiryStatus, { message: 'status는 pending 또는 answered여야 합니다.' })
  status?: InquiryStatus;

  @ApiPropertyOptional({ description: '미확인 답변만 조회 (답변 있음 + 고객 미확인)', example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean({ message: 'unread는 boolean이어야 합니다.' })
  unread?: boolean;
}
