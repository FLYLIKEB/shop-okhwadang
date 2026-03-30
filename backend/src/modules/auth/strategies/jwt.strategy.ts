import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

function cookieExtractor(req: Request): string | null {
  if (req?.cookies?.accessToken) {
    return req.cookies.accessToken as string;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload & { tokenType?: string }) {
    if (payload.tokenType === 'refresh') {
      throw new UnauthorizedException('Refresh tokens cannot be used for API access');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
