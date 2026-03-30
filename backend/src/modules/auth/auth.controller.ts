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

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 hour in ms
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

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
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = (req.cookies as Record<string, string | undefined>)?.refreshToken ?? '';
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken);
    setAuthCookies(res, accessToken, refreshToken);
    return { message: '토큰이 갱신되었습니다.' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    clearAuthCookies(res);
  }

  @Post('kakao')
  @Public()
  @HttpCode(HttpStatus.OK)
  async kakaoLogin(@Body() dto: OAuthCallbackDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.oauthService.handleKakao(dto.code);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: OAuthCallbackDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.oauthService.handleGoogle(dto.code);
    setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }
}
