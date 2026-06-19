import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderServiceRequestStatus } from '../entities/order-service-request.entity';

export class UpdateOrderServiceRequestDto {
  @ApiProperty({ enum: OrderServiceRequestStatus, example: OrderServiceRequestStatus.APPROVED })
  @IsEnum(OrderServiceRequestStatus, { message: '처리 상태가 올바르지 않습니다.' })
  status!: OrderServiceRequestStatus;

  @ApiPropertyOptional({ example: '고객 안내 완료' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
