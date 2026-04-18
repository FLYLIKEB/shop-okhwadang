import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: '비밀번호를 재설정할 이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해 주세요.' })
  email!: string;
}
