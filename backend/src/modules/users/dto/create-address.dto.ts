import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  zipcode!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

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
