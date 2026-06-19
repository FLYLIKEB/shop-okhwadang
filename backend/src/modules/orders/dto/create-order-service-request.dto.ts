import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderServiceRequestType } from '../entities/order-service-request.entity';

export class CreateOrderServiceRequestDto {
  @ApiProperty({ enum: OrderServiceRequestType, example: OrderServiceRequestType.CANCEL, description: '신청 유형' })
  @IsEnum(OrderServiceRequestType, { message: '신청 유형이 올바르지 않습니다.' })
  type!: OrderServiceRequestType;

  @ApiProperty({ example: '단순 변심', description: '신청 사유' })
  @IsString()
  @MaxLength(100, { message: '사유는 100자 이하여야 합니다.' })
  reason!: string;

  @ApiPropertyOptional({ example: '주문을 취소하고 싶습니다.', description: '상세 사유' })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ type: [String], description: '증빙 이미지 URL 목록' })
  @IsOptional()
  @IsArray({ message: '이미지 URL은 배열이어야 합니다.' })
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ example: true, description: '기존 배송지를 회수지로 사용' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean({ message: 'useShippingAddress는 boolean이어야 합니다.' })
  useShippingAddress?: boolean;

  @ApiPropertyOptional({ example: '홍길동' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pickupName?: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pickupPhone?: string;

  @ApiPropertyOptional({ example: '06252' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pickupZipcode?: string;

  @ApiPropertyOptional({ example: '서울특별시 강남구 역삼로 114' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupAddress?: string;

  @ApiPropertyOptional({ example: '8028호' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupAddressDetail?: string;
}
