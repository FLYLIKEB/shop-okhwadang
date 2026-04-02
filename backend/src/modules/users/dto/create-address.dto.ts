import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: '홍길동', description: '수령인 이름' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipientName!: string;

  @ApiProperty({ example: '010-1234-5678', description: '연락처' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '12345', description: '우편번호' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  zipcode!: string;

  @ApiProperty({ example: '서울특별시 강남구 테헤란로 123', description: '주소' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: '101동 101호', description: '상세 주소', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string | null;

  @ApiProperty({ example: '집', description: '주소지 레이블', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string | null;

  @ApiProperty({ example: true, description: '기본 주소지 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
