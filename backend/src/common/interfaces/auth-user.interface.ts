import { UserRole } from '../../modules/users/entities/user.entity';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  jti?: string;
}

export interface RequestWithAuthUser {
  user?: AuthUser;
}

export interface AuthenticatedRequestWithAuthUser {
  user: AuthUser;
}
