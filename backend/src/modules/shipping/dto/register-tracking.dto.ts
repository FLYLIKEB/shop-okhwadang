import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { CarrierCode } from '../interfaces/shipping-provider.interface';

export class RegisterTrackingDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['mock', 'cj', 'hanjin', 'lotte'])
  carrier!: CarrierCode;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
