import {
  Injectable,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import type ms from 'ms';
import { User, UserRole } from '../users/entities/user.entity';
import {
  UserAuthentication,
  OAuthProvider,
} from '../users/entities/user-authentication.entity';

export interface OAuthAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string; name: string; role: string };
  isNewUser: boolean;
}

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuthentication)
    private readonly userAuthRepository: Repository<UserAuthentication>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async handleKakao(code: string): Promise<OAuthAuthResponse> {
    const accessToken = await this.exchangeKakaoToken(code);
    const userInfo = await this.getKakaoUserInfo(accessToken);

    const providerId = String(userInfo.id);
    const email = userInfo.kakao_account?.email ?? null;
    const name = userInfo.kakao_account?.profile?.nickname ?? '카카오사용자';

    const { user, isNewUser } = await this.findOrCreateUser(
      OAuthProvider.KAKAO,
      providerId,
      email,
      name,
    );

    const tokens = await this.generateTokens(user);
    this.logger.log(`Kakao login: userId=${user.id} isNewUser=${isNewUser}`);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role }, isNewUser };
  }

  async handleGoogle(code: string): Promise<OAuthAuthResponse> {
    const accessToken = await this.exchangeGoogleToken(code);
    const userInfo = await this.getGoogleUserInfo(accessToken);

    const { user, isNewUser } = await this.findOrCreateUser(
      OAuthProvider.GOOGLE,
      userInfo.sub,
      userInfo.email,
      userInfo.name,
    );

    const tokens = await this.generateTokens(user);
    this.logger.log(`Google login: userId=${user.id} isNewUser=${isNewUser}`);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role }, isNewUser };
  }

  private async findOrCreateUser(
    provider: OAuthProvider,
    providerId: string,
    email: string | null,
    name: string,
  ): Promise<{ user: User; isNewUser: boolean }> {
    // 1. Find by provider + providerId
    const existingAuth = await this.userAuthRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });

    if (existingAuth) {
      return { user: existingAuth.user, isNewUser: false };
    }

    // 2. Find by email (link existing account)
    let user: User | null = null;
    let isNewUser = false;

    if (email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    // 3. Create new user
    if (!user) {
      const resolvedEmail = email ?? `${provider}_${providerId}@oauth.local`;
      user = this.userRepository.create({
        email: resolvedEmail,
        password: null,
        name,
        role: UserRole.USER,
        isActive: true,
      });
      user = await this.userRepository.save(user);
      isNewUser = true;
    }

    // 4. Create auth record (do not persist provider access token)
    const auth = this.userAuthRepository.create({
      user,
      userId: user.id,
      provider,
      providerId,
      accessToken: null,
    });
    await this.userAuthRepository.save(auth);

    return { user, isNewUser };
  }

  private async exchangeKakaoToken(code: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID ?? '',
        client_secret: process.env.KAKAO_CLIENT_SECRET ?? '',
        redirect_uri: process.env.KAKAO_REDIRECT_URI ?? '',
        code,
      });

      const response = await firstValueFrom(
        this.httpService.post<KakaoTokenResponse>(
          'https://kauth.kakao.com/oauth/token',
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return response.data.access_token;
    } catch {
      throw new BadGatewayException('소셜 로그인 서비스에 일시적 문제가 발생했습니다.');
    }
  }

  private async getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<KakaoUserInfo>('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch {
      throw new BadGatewayException('소셜 로그인 서비스에 일시적 문제가 발생했습니다.');
    }
  }

  private async exchangeGoogleToken(code: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
        code,
      });

      const response = await firstValueFrom(
        this.httpService.post<GoogleTokenResponse>(
          'https://oauth2.googleapis.com/token',
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return response.data.access_token;
    } catch {
      throw new BadGatewayException('소셜 로그인 서비스에 일시적 문제가 발생했습니다.');
    }
  }

  private async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GoogleUserInfo>('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch {
      throw new BadGatewayException('소셜 로그인 서비스에 일시적 문제가 발생했습니다.');
    }
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign({ ...payload, tokenType: 'access' });
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ms.StringValue;
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
        expiresIn: refreshExpiresIn,
        algorithm: 'HS256',
      },
    );
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });
    return { accessToken, refreshToken };
  }
}
