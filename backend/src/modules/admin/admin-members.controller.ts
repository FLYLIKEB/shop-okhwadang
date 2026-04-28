import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { AdminMembersService } from './admin-members.service';
import { AdminMembersQueryDto } from './dto/admin-members-query.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UserRole } from '../users/entities/user.entity';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { AuthenticatedRequestWithAuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('관리자 - 회원')
@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminMembersController {
  constructor(private readonly adminMembersService: AdminMembersService) {}

  @Get('members')
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 목록 조회', description: '모든 회원을 필터링하여 조회합니다.' })
  @ApiResponse({ status: 200, description: '회원 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  @ApiQuery({ name: 'role', required: false, type: String, description: '회원 역할 필터' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '검색어 (이메일/이름)' })
  findAll(@Query() query: AdminMembersQueryDto) {
    return this.adminMembersService.findAll(query);
  }

  @Patch('members/:id')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.MEMBER_ROLE_CHANGE, resourceType: 'member' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 역할 수정', description: '회원의 역할을 수정합니다.' })
  @ApiResponse({ status: 200, description: '회원 역할 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '회원 ID' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: AuthenticatedRequestWithAuthUser,
  ) {
    return this.adminMembersService.updateRole(
      id,
      dto.role as UserRole,
      req.user.id,
      req.user.role as UserRole,
    );
  }

  @Patch('members/:id/unlock')
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 잠금 해제', description: '로그인 실패 잠금을 수동 해제합니다.' })
  @ApiResponse({ status: 200, description: '잠금 해제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '회원 ID' })
  unlockMember(@Param('id', ParseIntPipe) id: number) {
    return this.adminMembersService.unlockAccount(id);
  }
}
