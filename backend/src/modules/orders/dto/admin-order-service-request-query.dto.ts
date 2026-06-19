import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderServiceRequestStatus, OrderServiceRequestType } from '../entities/order-service-request.entity';

export class AdminOrderServiceRequestQueryDto {
  @ApiPropertyOptional({ enum: OrderServiceRequestType })
  @IsOptional()
  @IsEnum(OrderServiceRequestType)
  type?: OrderServiceRequestType;

  @ApiPropertyOptional({ enum: OrderServiceRequestStatus })
  @IsOptional()
  @IsEnum(OrderServiceRequestStatus)
  status?: OrderServiceRequestStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
