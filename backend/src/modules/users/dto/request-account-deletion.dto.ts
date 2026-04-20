import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestAccountDeletionDto {
  @ApiProperty({ description: '본인 확인 비밀번호', example: 'Pa$$w0rd!' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password!: string;
}
