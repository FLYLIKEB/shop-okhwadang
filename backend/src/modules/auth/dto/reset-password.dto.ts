import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-from-email',
    description: '이메일로 발송된 비밀번호 재설정 토큰',
  })
  @IsString({ message: '재설정 토큰을 입력해 주세요.' })
  @IsNotEmpty({ message: '재설정 토큰을 입력해 주세요.' })
  token!: string;

  @ApiProperty({ example: 'NewPass123!', description: '새 비밀번호 (8자 이상)' })
  @IsString({ message: '새 비밀번호를 입력해 주세요.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 최대 100자까지 입력 가능합니다.' })
  newPassword!: string;
}
