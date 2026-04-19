import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { RequestAccountDeletionDto } from './dto/request-account-deletion.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

@ApiTags('사용자')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: '프로필 수정', description: '현재 사용자의 프로필 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/addresses')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배송지 목록 조회', description: '현재 사용자의 배송지 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '배송지 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.getAddresses(user.id);
  }

  @Post('me/addresses')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배송지 생성', description: '새로운 배송지를 추가합니다.' })
  @ApiResponse({ status: 201, description: '배송지 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('me/addresses/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배송지 수정', description: '기존 배송지 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '배송지 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '배송지를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '배송지 ID' })
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배송지 삭제', description: '배송지를 삭제합니다.' })
  @ApiResponse({ status: 200, description: '배송지 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '배송지를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '배송지 ID' })
  deleteAddress(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Post('me/request-deletion')
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 탈퇴 요청', description: '비밀번호 재확인 후 탈퇴 예약을 생성합니다.' })
  @ApiResponse({ status: 201, description: '탈퇴 요청 성공' })
  @ApiResponse({ status: 400, description: '비밀번호 불일치 또는 요청 불가 상태' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  requestDeletion(@CurrentUser() user: AuthUser, @Body() dto: RequestAccountDeletionDto) {
    return this.usersService.requestAccountDeletion(user.id, dto.password);
  }
}
