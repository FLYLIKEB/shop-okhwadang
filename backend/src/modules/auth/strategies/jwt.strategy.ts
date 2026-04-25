import { Inject, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { TokenBlacklistService } from '../token-blacklist.service';
import { AUTH_CONFIG, AuthConfig } from '../../../config/auth.config';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject(AUTH_CONFIG)
    authConfig: AuthConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwt.publicKey,
      algorithms: ['RS256'],
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
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

    return { id: payload.sub, email: user.email, role: user.role, jti: payload.jti };
  }
}
