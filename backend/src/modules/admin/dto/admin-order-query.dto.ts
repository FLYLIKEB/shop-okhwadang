import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminOrderQueryDto {
  @ApiProperty({ example: 'paid', enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'], description: '주문 상태', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'])
  status?: string;

  @ApiProperty({ example: '홍길동', description: '검색어 (수령인명 또는 주문번호)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ example: '2024-01-01', description: '시작 날짜', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', description: '종료 날짜', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ example: 1, description: '페이지 번호', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, description: '페이지당 개수', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
