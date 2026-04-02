import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// state parameter is validated client-side (SPA sessionStorage) per architecture decision.
// The backend only processes the authorization code.
export class OAuthCallbackDto {
  @ApiProperty({ example: 'authorization_code_from_provider', description: 'OAuth 인증 코드' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
