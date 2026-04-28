import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type ms from 'ms';
import { User } from '../../users/entities/user.entity';
import { AUTH_CONFIG, AuthConfig } from '../../../config/auth.config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenIssuerService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(AUTH_CONFIG)
    private readonly authConfig: AuthConfig,
  ) {}

  issueTokens(user: Pick<User, 'id' | 'email' | 'role'>): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jti = randomUUID();
    const accessToken = this.jwtService.sign({ ...payload, tokenType: 'access', jti });
    const refreshExpiresIn = this.authConfig.jwt.refreshExpiresIn as ms.StringValue;
    const refreshSecret = this.authConfig.jwt.refreshSecret;
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: refreshSecret ?? this.authConfig.jwt.secret,
        expiresIn: refreshExpiresIn,
        algorithm: 'HS256',
      },
    );
    return { accessToken, refreshToken };
  }

  async issueAndPersistRefresh(user: Pick<User, 'id' | 'email' | 'role'>): Promise<TokenPair> {
    const tokens = this.issueTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });
    return tokens;
  }
}
