import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { NotificationService } from '../notification/notification.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { AuthEventEmitter } from './auth-event.emitter';
import { UserRegisteredEvent } from './events/user-registered.event';
import { TokenIssuerService } from './services/token-issuer.service';
import { AuthLoginPolicyService } from './services/auth-login-policy.service';
import { AuthAuditService } from './services/auth-audit.service';
import { AUTH_CONFIG, AuthConfig } from '../../config/auth.config';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MIN = 15;
const EMAIL_VERIFICATION_TTL_MS = EMAIL_VERIFICATION_TTL_MIN * 60 * 1000;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const FORGOT_PASSWORD_RESPONSE = {
  message: '가입된 계정이 있다면 비밀번호 재설정 링크를 이메일로 발송했습니다.',
};
const RESET_PASSWORD_SUCCESS_RESPONSE = {
  message: '비밀번호가 재설정되었습니다.',
};
const INVALID_PASSWORD_RESET_TOKEN_MESSAGE =
  '유효하지 않거나 만료된 비밀번호 재설정 토큰입니다.';
const VERIFICATION_EMAIL_SENT_RESPONSE = {
  message: '인증 이메일이 발송되었습니다. 링크를 확인해 주세요.',
};
const EMAIL_VERIFIED_RESPONSE = {
  message: '이메일이 인증되었습니다.',
};
const INVALID_VERIFICATION_TOKEN_MESSAGE =
  '유효하지 않거나 만료된 인증 토큰입니다.';
const EMAIL_ALREADY_VERIFIED_MESSAGE = '이미 인증된 이메일입니다.';

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
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepository: Repository<VerificationToken>,
    private readonly jwtService: JwtService,
    private readonly tokenIssuerService: TokenIssuerService,
    private readonly authLoginPolicyService: AuthLoginPolicyService,
    private readonly authAuditService: AuthAuditService,
    private readonly notificationService: NotificationService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly authEventEmitter: AuthEventEmitter,
    @Inject(AUTH_CONFIG)
    private readonly authConfig: AuthConfig,
  ) {}

  onModuleInit() {
    if (!this.authConfig.jwt.refreshSecret) {
      if (this.authConfig.nodeEnv === 'production') {
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
      isEmailVerified: false,
    });
    await this.userRepository.save(user);

    this.authEventEmitter.emitUserRegistered(new UserRegisteredEvent(Number(user.id), user.email));

    await this.createVerificationTokenAndSendEmail(user);

    const tokens = await this.tokenIssuerService.issueAndPersistRefresh(user);

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
      await this.authAuditService.logUserNotFound(dto.email, ip, userAgent);
      throw new UnauthorizedException('가입되지 않은 이메일입니다.');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        '소셜 로그인으로 가입된 계정입니다. 카카오 또는 Google 로그인을 이용해주세요.',
      );
    }

    if (user.deletionScheduledAt && !user.deletedAt) {
      throw new ForbiddenException(
        `탈퇴 예약된 계정입니다. ${user.deletionScheduledAt.toISOString()} 이전 로그인으로 복구를 원하시면 고객센터에 문의해 주세요.`,
      );
    }

    this.authLoginPolicyService.assertNotLocked(user);

    if (!user.isActive) {
      throw new ForbiddenException('비활성화된 계정입니다.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.authLoginPolicyService.handlePasswordMismatch(user, dto.email, ip, userAgent);
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('이메일 인증이 필요합니다. 인증 메일을 확인해 주세요.');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      });
    }

    const tokens = await this.tokenIssuerService.issueAndPersistRefresh(user);

    this.logger.log(`User logged in: ${dto.email}`);
    await this.authAuditService.logLoginSuccess(user, dto.email, ip, userAgent);
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
        secret: this.authConfig.jwt.refreshSecret ?? this.authConfig.jwt.secret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.refreshToken) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const matches = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!matches) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const tokens = await this.tokenIssuerService.issueAndPersistRefresh(user);

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
      lastFailedLoginAt: null,
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

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const tokenHash = this.hashVerificationToken(dto.token);
    const verificationToken = await this.verificationTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!verificationToken || verificationToken.usedAt) {
      throw new BadRequestException(INVALID_VERIFICATION_TOKEN_MESSAGE);
    }

    if (verificationToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(INVALID_VERIFICATION_TOKEN_MESSAGE);
    }

    const markUsedResult = await this.verificationTokenRepository.update(
      { id: verificationToken.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    if (markUsedResult.affected !== 1) {
      throw new BadRequestException(INVALID_VERIFICATION_TOKEN_MESSAGE);
    }

    await this.userRepository.update(verificationToken.userId, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    this.logger.log(`Email verified for user: ${verificationToken.userId}`);
    return EMAIL_VERIFIED_RESPONSE;
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return VERIFICATION_EMAIL_SENT_RESPONSE;
    }

    if (user.isEmailVerified) {
      return { message: EMAIL_ALREADY_VERIFIED_MESSAGE };
    }

    await this.verificationTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    await this.createVerificationTokenAndSendEmail(user);

    return VERIFICATION_EMAIL_SENT_RESPONSE;
  }

  private async createVerificationTokenAndSendEmail(user: User): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    const verificationToken = this.verificationTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashVerificationToken(rawToken),
      expiresAt,
      usedAt: null,
    });
    await this.verificationTokenRepository.save(verificationToken);

    await this.notificationService.sendEmailVerification(user.email, {
      recipientName: user.name,
      verificationUrl: this.buildEmailVerificationUrl(rawToken),
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MIN,
    });
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildPasswordResetUrl(token: string): string {
    const url = new URL('/reset-password', this.authConfig.frontend.baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildEmailVerificationUrl(token: string): string {
    const url = new URL('/verify-email', this.authConfig.frontend.baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }
}
