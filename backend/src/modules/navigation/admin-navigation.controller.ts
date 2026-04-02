import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 네비게이션')
@Controller('admin/navigation')
@Roles('admin', 'super_admin')
export class AdminNavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 네비게이션 목록 조회', description: '모든 네비게이션 항목을 그룹별로 조회합니다. (비활성 포함)' })
  @ApiResponse({ status: 200, description: '네비게이션 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'group', required: false, enum: ['gnb', 'sidebar', 'footer'], description: '네비게이션 그룹' })
  findAll(@Query('group') group: 'gnb' | 'sidebar' | 'footer') {
    return this.navigationService.findAllByGroup(group);
  }
}
