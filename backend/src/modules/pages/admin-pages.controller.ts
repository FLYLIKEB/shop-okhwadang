import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 페이지')
@Controller('admin/pages')
@Roles('admin', 'super_admin')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 페이지 목록 조회', description: '모든 페이지를 조회합니다. (비公開 포함)' })
  @ApiResponse({ status: 200, description: '페이지 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  findAll() {
    return this.pagesService.findAllAdmin();
  }
}
