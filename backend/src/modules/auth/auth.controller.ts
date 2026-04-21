import {
  Inject,
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { OAuthProvider } from '../users/entities/user-authentication.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { AUTH_CONFIG, AuthConfig } from '../../config/auth.config';

interface JwtUser {
  id: number;
  email: string;
  role: string;
  jti?: string;
}

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getBaseOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, secure: boolean): void {
  res.cookie('accessToken', accessToken, {
    ...getBaseOptions(secure),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie('refreshToken', refreshToken, {
    ...getBaseOptions(secure),
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/auth/refresh',
  });
}

function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie('accessToken', getBaseOptions(secure));
  res.clearCookie('refreshToken', { ...getBaseOptions(secure), path: '/api/auth/refresh' });
}

@Throttle({ auth: { limit: 30, ttl: 60000 } })
@SkipThrottle({ forgotPassword: true, resendVerification: true })
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly jwtService: JwtService,
    @Inject(AUTH_CONFIG)
    private readonly authConfig: AuthConfig,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: '회원가입', description: '이메일/비밀번호로 새로운 계정을 생성합니다. 성공 시 accessToken과 refreshToken이 쿠키에 저장됩니다.' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '입력값 오류 또는 이미 존재하는 이메일' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    setAuthCookies(res, accessToken, refreshToken, this.authConfig.cookie.secure);
    return { user, accessToken, refreshToken };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인', description: '이메일/비밀번호로 로그인합니다. 성공 시 accessToken과 refreshToken이 쿠키에 저장됩니다.' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호 오류' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] ?? null;
    const { accessToken, refreshToken, user } = await this.authService.login(dto, ip, userAgent);
    setAuthCookies(res, accessToken, refreshToken, this.authConfig.cookie.secure);
    return { user, accessToken, refreshToken };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ forgotPassword: false })
  @Throttle({ forgotPassword: { limit: 1, ttl: 60000 } })
  @ApiOperation({
    summary: '비밀번호 재설정 요청',
    description: '가입된 이메일이면 비밀번호 재설정 링크를 발송합니다. 존재하지 않는 이메일에도 동일한 응답을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 안내 처리 완료' })
  @ApiResponse({ status: 429, description: '같은 이메일로 너무 많은 요청' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '비밀번호 재설정',
    description: '이메일로 받은 재설정 토큰과 새 비밀번호로 비밀번호를 변경합니다.',
  })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
  @ApiResponse({ status: 400, description: '토큰이 유효하지 않거나 만료됨' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ resendVerification: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: '이메일 인증',
    description: '이메일로 받은 인증 토큰으로 이메일 인증을 완료합니다.',
  })
  @ApiResponse({ status: 200, description: '이메일 인증 성공' })
  @ApiResponse({ status: 400, description: '토큰이 유효하지 않거나 만료됨' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ resendVerification: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: '인증 이메일 재발송',
    description: '이메일 인증을 다시 요청합니다. 1분에 최대 3회까지 요청할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '인증 이메일 발송 처리 완료' })
  @ApiResponse({ status: 429, description: '너무 많은 요청' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: '프로필 조회', description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로필 정보' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getProfile(@CurrentUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: '현재 사용자 조회', description: '현재 로그인한 사용자의 정보를 반환합니다. (profile과 동일)' })
  @ApiResponse({ status: 200, description: '사용자 정보' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getMe(@CurrentUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신', description: 'refreshToken을 사용하여 accessToken을 갱신합니다. 새로운 토큰 쌍이 쿠키에 저장됩니다.' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 refreshToken' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = (req.cookies as Record<string, string | undefined>)?.refreshToken ?? '';
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken);
    setAuthCookies(res, accessToken, refreshToken, this.authConfig.cookie.secure);
    return { message: '토큰이 갱신되었습니다.' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: '로그아웃', description: '현재 세션을 종료하고 토큰을 무효화합니다. 인증 쿠키가 삭제됩니다.' })
  @ApiResponse({ status: 204, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async logout(@CurrentUser() user: JwtUser, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const rawAccessToken = (req.cookies as Record<string, string | undefined>)?.accessToken ?? '';
    if (rawAccessToken) {
      const decoded = this.jwtService.decode(rawAccessToken) as { jti?: string; exp?: number } | null;
      if (decoded?.jti && decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await this.authService.logout(user.id, decoded.jti, expiresAt);
        clearAuthCookies(res, this.authConfig.cookie.secure);
        return;
      }
    }
    await this.authService.logoutAll(user.id);
    clearAuthCookies(res, this.authConfig.cookie.secure);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: '모든 기기 로그아웃', description: '해당 사용자의 모든 토큰을 무효화합니다. 모든 기기에서 로그아웃됩니다.' })
  @ApiResponse({ status: 204, description: '모든 기기 로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async logoutAll(@CurrentUser() user: JwtUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(user.id);
    clearAuthCookies(res, this.authConfig.cookie.secure);
  }

  @Post('kakao')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '카카오 로그인', description: '카카오 OAuth 인가 코드를 사용하여 로그인합니다. 회원가입이 되어 있지 않으면 자동 회원가입됩니다.' })
  @ApiResponse({ status: 200, description: '카카오 로그인 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 인가 코드' })
  async kakaoLogin(@Body() dto: OAuthCallbackDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.oauthService.handleKakao(dto.code);
    setAuthCookies(res, accessToken, refreshToken, this.authConfig.cookie.secure);
    return { user };
  }

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구글 로그인', description: '구글 OAuth 인가 코드를 사용하여 로그인합니다. 회원가입이 되어 있지 않으면 자동 회원가입됩니다.' })
  @ApiResponse({ status: 200, description: '구글 로그인 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 인가 코드' })
  async googleLogin(@Body() dto: OAuthCallbackDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.oauthService.handleGoogle(dto.code);
    setAuthCookies(res, accessToken, refreshToken, this.authConfig.cookie.secure);
    return { user };
  }

  @Delete('oauth/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'OAuth 연결 해제', description: '현재 사용자의 특정 OAuth 제공사 연결을 해제합니다. 마지막 인증 수단인 경우 해제가 거부됩니다.' })
  @ApiParam({ name: 'provider', enum: OAuthProvider, description: 'OAuth 제공사 (kakao | google)' })
  @ApiResponse({ status: 204, description: 'OAuth 연결 해제 성공' })
  @ApiResponse({ status: 400, description: '마지막 인증 수단은 해제할 수 없습니다.' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '연결된 OAuth 계정을 찾을 수 없습니다.' })
  async disconnectOAuth(
    @CurrentUser() user: JwtUser,
    @Param('provider', new ParseEnumPipe(OAuthProvider)) provider: OAuthProvider,
  ): Promise<void> {
    await this.oauthService.disconnect(user.id, provider);
  }
}
