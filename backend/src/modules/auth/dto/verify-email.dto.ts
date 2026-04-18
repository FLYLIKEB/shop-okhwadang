import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'abc123def456...', description: '이메일 인증 토큰' })
  @IsString({ message: '토큰을 입력해 주세요.' })
  @IsNotEmpty({ message: '토큰을 입력해 주세요.' })
  token!: string;
}