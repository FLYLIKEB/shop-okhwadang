import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해 주세요.' })
  email!: string;

  @IsString({ message: '비밀번호를 입력해 주세요.' })
  @IsNotEmpty({ message: '비밀번호를 입력해 주세요.' })
  password!: string;
}
