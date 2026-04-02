import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type ms from 'ms';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    if (!process.env.JWT_REFRESH_SECRET) {
      this.logger.warn(
        'JWT_REFRESH_SECRET is not set. Using JWT_SECRET as fallback. Set a separate secret in production.',
      );
    }
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (!PASSWORD_REGEX.test(dto.password)) {
      throw new BadRequestException('비밀번호는 문자, 숫자, 특수문자를 포함해야 합니다.');
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashed,
      name: dto.name,
    });
    await this.userRepository.save(user);

    const tokens = this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });

    this.logger.log(`User registered: ${dto.email}`);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('가입되지 않은 이메일입니다.');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        '소셜 로그인으로 가입된 계정입니다. 카카오 или Google 로그인을 이용해주세요.',
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      throw new ForbiddenException(
        `계정이 잠겼습니다. ${remainingSec}초 후 다시 시도하세요.`,
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.userRepository.update(user.id, {
          failedLoginAttempts: attempts,
          lockedUntil,
        });
        this.logger.warn(`Account locked due to failed login attempts: ${dto.email}`);
        throw new ForbiddenException(
          `연속 로그인 실패로 계정이 잠겼습니다. ${Math.ceil(LOCKOUT_DURATION_MS / 1000)}초 후 다시 시도하세요.`,
        );
      }
      await this.userRepository.update(user.id, {
        failedLoginAttempts: attempts,
      });
      const delaySec = Math.pow(2, attempts);
      await this.delay(delaySec * 1000);
      throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('비활성화된 계정입니다.');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    const tokens = this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });

    this.logger.log(`User logged in: ${dto.email}`);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async getProfile(userId: number): Promise<Omit<User, 'password' | 'refreshToken'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }
    const { password, refreshToken, ...profile } = user;
    void password;
    void refreshToken;
    return profile;
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    let payload: { sub: number; email: string; role: string; tokenType?: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const matches = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!matches) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const tokens = this.generateTokens(user);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });

    this.logger.log(`Tokens refreshed for user: ${user.email}`);
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
    this.logger.log(`User logged out: ${userId}`);
  }

  private generateTokens(user: User): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };
    // accessToken includes tokenType: 'access' to prevent refresh tokens from being used as access tokens
    const accessToken = this.jwtService.sign({ ...payload, tokenType: 'access' });
    // refreshToken uses longer expiry; cast to ms.StringValue required by jsonwebtoken types
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ms.StringValue;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: refreshSecret ?? process.env.JWT_SECRET,
        expiresIn: refreshExpiresIn,
      },
    );
    return { accessToken, refreshToken };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
