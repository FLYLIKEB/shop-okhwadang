import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

interface JwtUser {
  id: number;
  email: string;
  role: string;
}

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getBaseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, {
    ...getBaseOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie('refreshToken', refreshToken, {
    ...getBaseOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/auth/refresh',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', getBaseOptions());
  res.clearCookie('refreshToken', { ...getBaseOptions(), path: '/api/auth/refresh' });
}

@Throttle({ auth: { limit: 30, ttl: 60000 } })
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: '회원가입', description: '이메일/비밀번호로 새로운 계정을 생성합니다. 성공 시 accessToken과 refreshToken이 쿠키에 저장됩니다.' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '입력값 오류 또는 이미 존재하는 이메일' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인', description: '이메일/비밀번호로 로그인합니다. 성공 시 accessToken과 refreshToken이 쿠키에 저장됩니다.' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호 오류' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
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
    setAuthCookies(res, accessToken, refreshToken);
    return { message: '토큰이 갱신되었습니다.' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: '로그아웃', description: '현재 세션을 종료하고 토큰을 무효화합니다. 인증 쿠키가 삭제됩니다.' })
  @ApiResponse({ status: 204, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async logout(@CurrentUser() user: JwtUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    clearAuthCookies(res);
  }

  @Post('kakao')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '카카오 로그인', description: '카카오 OAuth 인가 코드를 사용하여 로그인합니다. 회원가입이 되어 있지 않으면 자동 회원가입됩니다.' })
  @ApiResponse({ status: 200, description: '카카오 로그인 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 인가 코드' })
  async kakaoLogin(@Body() dto: OAuthCallbackDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.oauthService.handleKakao(dto.code);
    setAuthCookies(res, accessToken, refreshToken);
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
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }
}
