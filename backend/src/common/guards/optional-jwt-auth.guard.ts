import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Populates request.user when a valid access token is present, but keeps the
 * endpoint public for anonymous users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser | null>(
    _err: unknown,
    user: TUser | false,
  ): TUser | null {
    return user || null;
  }
}
