import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { InquiryType } from '../entities/inquiry.entity';

export class CreateInquiryDto {
  @ApiProperty({ example: '상품', enum: ['상품', '배송', '결제', '교환/반품', '기타'], description: '문의 유형' })
  @IsEnum(['상품', '배송', '결제', '교환/반품', '기타'])
  type!: InquiryType;

  @ApiProperty({ example: '이 상품의 원산지가 어디인가요?', description: '문의 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '옥화당 보이차의 원산지와 제조 공정에 대해 알고 싶습니다.', description: '문의 내용' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
