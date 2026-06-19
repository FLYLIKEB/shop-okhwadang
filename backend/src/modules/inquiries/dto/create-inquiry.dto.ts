import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InquiryType } from '../entities/inquiry.entity';

export class CreateInquiryDto {
  @ApiProperty({ example: 1, description: '상품 ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'productId는 정수여야 합니다.' })
  productId?: number;

  @ApiProperty({ example: InquiryType.PRODUCT, enum: InquiryType, description: '문의 유형' })
  @IsEnum(InquiryType)
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

  @ApiProperty({ example: false, description: '비밀글 여부', required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean({ message: 'isSecret은 boolean이어야 합니다.' })
  isSecret?: boolean;
}
