import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RegisterShippingDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['mock', 'cj', 'hanjin', 'lotte'])
  carrier!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
