import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ example: 'refresh_token_here', description: '리프레시 토큰' })
  @IsString()
  refreshToken!: string;
}
