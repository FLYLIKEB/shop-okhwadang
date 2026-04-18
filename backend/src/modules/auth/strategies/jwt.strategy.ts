import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as fs from 'fs';
import * as path from 'path';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { TokenBlacklistService } from '../token-blacklist.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  jti?: string;
  tokenType?: string;
}

function cookieExtractor(req: Request): string | null {
  if (req?.cookies?.accessToken) {
    return req.cookies.accessToken as string;
  }
  return null;
}

function getJwtPublicKey(): string {
  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY;
  }
  if (process.env.JWT_PUBLIC_KEY_FILE && fs.existsSync(process.env.JWT_PUBLIC_KEY_FILE)) {
    return fs.readFileSync(process.env.JWT_PUBLIC_KEY_FILE, 'utf-8');
  }
  const keyPath = path.resolve(process.cwd(), 'keys', 'jwt-public.pem');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8');
  }
  throw new Error('JWT_PUBLIC_KEY environment variable or keys/jwt-public.pem file is required');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtPublicKey(),
      algorithms: ['RS256'],
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.tokenType === 'refresh') {
      throw new UnauthorizedException('Refresh tokens cannot be used for API access');
    }

    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        this.logger.warn(`Blacklisted token used: jti=${payload.jti}, sub=${payload.sub}`);
        throw new UnauthorizedException('토큰이 무효화되었습니다.');
      }
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    return { id: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
  }
}