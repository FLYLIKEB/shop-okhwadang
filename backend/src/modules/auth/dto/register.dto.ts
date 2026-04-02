import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해 주세요.' })
  email!: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (8자 이상)' })
  @IsString({ message: '비밀번호를 입력해 주세요.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 최대 100자까지 입력 가능합니다.' })
  password!: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString({ message: '이름을 입력해 주세요.' })
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  @MaxLength(100, { message: '이름은 최대 100자까지 입력 가능합니다.' })
  name!: string;
}
