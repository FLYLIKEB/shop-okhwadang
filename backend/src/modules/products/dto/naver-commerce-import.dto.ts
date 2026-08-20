import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class NaverCommerceImportDto {
  @ApiProperty({
    type: [String],
    description: '미리보기에서 반영 대상으로 선택한 네이버 상품 식별자 목록',
    example: ['SKU-001', 'naver-1002'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  selectedIdentifiers!: string[];
}
