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
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type ms from 'ms';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { NotificationService } from '../notification/notification.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { TokenBlacklistService } from './token-blacklist.service';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const FORGOT_PASSWORD_RESPONSE = {
  message: '가입된 계정이 있다면 비밀번호 재설정 링크를 이메일로 발송했습니다.',
};
const RESET_PASSWORD_SUCCESS_RESPONSE = {
  message: '비밀번호가 재설정되었습니다.',
};
const INVALID_PASSWORD_RESET_TOKEN_MESSAGE =
  '유효하지 않거나 만료된 비밀번호 재설정 토큰입니다.';

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
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  onModuleInit() {
    if (!process.env.JWT_REFRESH_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
      }
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

  async login(dto: LoginDto, ip?: string | null, userAgent?: string | null): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      await this.auditLogService.log({
        actorId: 0,
        actorRole: 'anonymous',
        action: AuditAction.LOGIN_FAILURE,
        resourceType: 'auth',
        beforeJson: { email: dto.email },
        afterJson: { reason: 'user_not_found' },
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      });
      throw new UnauthorizedException('가입되지 않은 이메일입니다.');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        '소셜 로그인으로 가입된 계정입니다. 카카오 또는 Google 로그인을 이용해주세요.',
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
      await this.auditLogService.log({
        actorId: user.id,
        actorRole: user.role,
        action: AuditAction.LOGIN_FAILURE,
        resourceType: 'auth',
        beforeJson: { email: dto.email },
        afterJson: { reason: 'invalid_password', attempts },
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      });
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
    await this.auditLogService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.LOGIN_SUCCESS,
      resourceType: 'auth',
      beforeJson: { email: dto.email },
      afterJson: { userId: user.id },
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
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
        algorithms: ['HS256'],
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return FORGOT_PASSWORD_RESPONSE;
    }

    await this.passwordResetTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    const resetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashPasswordResetToken(rawToken),
      expiresAt,
      usedAt: null,
    });
    await this.passwordResetTokenRepository.save(resetToken);

    await this.notificationService.sendPasswordReset(user.email, {
      recipientName: user.name,
      resetUrl: this.buildPasswordResetUrl(rawToken),
      expiresInMinutes: PASSWORD_RESET_TTL_MS / 60000,
    });

    return FORGOT_PASSWORD_RESPONSE;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (!PASSWORD_REGEX.test(dto.newPassword)) {
      throw new BadRequestException('비밀번호는 문자, 숫자, 특수문자를 포함해야 합니다.');
    }

    const tokenHash = this.hashPasswordResetToken(dto.token);
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(INVALID_PASSWORD_RESET_TOKEN_MESSAGE);
    }

    const markUsedResult = await this.passwordResetTokenRepository.update(
      { id: resetToken.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    if (markUsedResult.affected !== 1) {
      throw new BadRequestException(INVALID_PASSWORD_RESET_TOKEN_MESSAGE);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
      refreshToken: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await this.passwordResetTokenRepository.update(
      { userId: resetToken.userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return RESET_PASSWORD_SUCCESS_RESPONSE;
  }

  async logout(userId: number, jti: string, expiresAt: Date): Promise<void> {
    await this.tokenBlacklistService.addToBlacklist(jti, userId, expiresAt, 'user_logout');
    await this.userRepository.update(userId, { refreshToken: null });
    this.logger.log(`User logged out: userId=${userId}, jti=${jti}`);
  }

  async logoutAll(userId: number): Promise<void> {
    await this.tokenBlacklistService.revokeAllUserTokens(userId, 'user_logout_all');
    await this.userRepository.update(userId, { refreshToken: null });
    this.logger.log(`All tokens revoked for user: ${userId}`);
  }

  private generateTokens(user: User): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jti = randomUUID();
    // accessToken includes tokenType: 'access' and jti (JWT ID) for blacklist tracking
    const accessToken = this.jwtService.sign({ ...payload, tokenType: 'access', jti });
    // refreshToken uses longer expiry; cast to ms.StringValue required by jsonwebtoken types
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildPasswordResetUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL;
    if (!baseUrl) {
      throw new Error('FRONTEND_URL environment variable is required');
    }

    const url = new URL('/reset-password', baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }
}
