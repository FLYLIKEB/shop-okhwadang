import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

@ApiTags('사용자 - 회원 등급')
@Controller('users')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('me/tier')
  @ApiCookieAuth()
  @ApiOperation({ summary: '내 등급 조회', description: '현재 회원 등급 및 혜택을 조회합니다.' })
  @ApiResponse({ status: 200, description: '등급 정보 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getMyTier(@CurrentUser() user: AuthUser) {
    return this.membershipService.getUserTierInfo(user.id);
  }
}
