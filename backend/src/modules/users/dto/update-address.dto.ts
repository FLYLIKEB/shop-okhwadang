import {
  IsString, IsOptional, MaxLength, IsBoolean,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipcode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
