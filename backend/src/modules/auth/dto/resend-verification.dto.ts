import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com', description: '인증 이메일을 재발송할 이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해 주세요.' })
  @IsNotEmpty({ message: '이메일을 입력해 주세요.' })
  email!: string;
}