import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type ms from 'ms';
import { User } from '../../users/entities/user.entity';

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
  ) {}

  issueTokens(user: Pick<User, 'id' | 'email' | 'role'>): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jti = randomUUID();
    const accessToken = this.jwtService.sign({ ...payload, tokenType: 'access', jti });
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ms.StringValue;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: refreshSecret ?? process.env.JWT_SECRET,
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

