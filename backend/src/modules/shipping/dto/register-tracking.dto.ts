import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { CarrierCode } from '../interfaces/shipping-provider.interface';

export class RegisterTrackingDto {
  @ApiProperty({ example: 'cj', enum: ['mock', 'cj', 'hanjin', 'lotte'], description: '택배사 코드' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['mock', 'cj', 'hanjin', 'lotte'])
  carrier!: CarrierCode;

  @ApiProperty({ example: '1234567890', description: '운송장 번호' })
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
