import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RegisterShippingDto {
  @ApiProperty({ example: 'cj', enum: ['mock', 'cj', 'hanjin', 'lotte'], description: '택배사 코드' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['mock', 'cj', 'hanjin', 'lotte'])
  carrier!: string;

  @ApiProperty({ example: '1234567890', description: '운송장 번호' })
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
