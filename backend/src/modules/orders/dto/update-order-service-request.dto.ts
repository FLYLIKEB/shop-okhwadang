import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderServiceRequestStatus } from '../entities/order-service-request.entity';

export class UpdateOrderServiceRequestDto {
  @ApiProperty({ enum: OrderServiceRequestStatus, example: OrderServiceRequestStatus.APPROVED })
  @IsEnum(OrderServiceRequestStatus, { message: '처리 상태가 올바르지 않습니다.' })
  status!: OrderServiceRequestStatus;

  @ApiPropertyOptional({ example: '고객 안내 완료', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '관리자 메모는 최대 500자까지 입력 가능합니다.' })
  adminNote?: string;
}
