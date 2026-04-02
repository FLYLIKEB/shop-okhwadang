import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AnswerInquiryDto {
  @ApiProperty({ example: '원산지는 제주도이며, 전통的方式来制造...', description: '답변 내용' })
  @IsString()
  @IsNotEmpty()
  answer!: string;
}
