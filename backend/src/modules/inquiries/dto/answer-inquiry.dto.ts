import { IsString, IsNotEmpty } from 'class-validator';

export class AnswerInquiryDto {
  @IsString()
  @IsNotEmpty()
  answer!: string;
}
