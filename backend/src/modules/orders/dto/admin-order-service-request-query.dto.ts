import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DefaultPaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderServiceRequestStatus, OrderServiceRequestType } from '../entities/order-service-request.entity';

export class AdminOrderServiceRequestQueryDto extends DefaultPaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderServiceRequestType })
  @IsOptional()
  @IsEnum(OrderServiceRequestType)
  type?: OrderServiceRequestType;

  @ApiPropertyOptional({ enum: OrderServiceRequestStatus })
  @IsOptional()
  @IsEnum(OrderServiceRequestStatus)
  status?: OrderServiceRequestStatus;
}
