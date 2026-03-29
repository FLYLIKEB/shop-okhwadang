import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { InquiryType } from '../entities/inquiry.entity';

export class CreateInquiryDto {
  @IsEnum(['상품', '배송', '결제', '교환/반품', '기타'])
  type!: InquiryType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
