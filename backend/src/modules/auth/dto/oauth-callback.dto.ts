import { IsString, IsNotEmpty } from 'class-validator';

// state parameter is validated client-side (SPA sessionStorage) per architecture decision.
// The backend only processes the authorization code.
export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
