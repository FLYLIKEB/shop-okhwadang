import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateRestockAlertDto {
  @ApiPropertyOptional({ example: 1, description: '상품 옵션 ID (옵션별 알림이 필요한 경우)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  productOptionId?: number;
}
