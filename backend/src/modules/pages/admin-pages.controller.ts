import { Body, Controller, Get, Headers, Param, ParseIntPipe, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SavePageDraftDto } from './dto/save-page-draft.dto';

@ApiTags('관리자 - 페이지')
@Controller('admin/pages')
@Roles('admin', 'super_admin')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Put(':id/draft')
  @ApiCookieAuth()
  @ApiOperation({ summary: '페이지 전체 초안을 원자적으로 저장' })
  @ApiResponse({ status: 200, description: '숨김 블록을 포함한 저장된 페이지' })
  saveDraft(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') key: string | undefined, @Body() dto: SavePageDraftDto) {
    return this.pagesService.saveDraft(id, user.id, key, dto);
  }

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 페이지 목록 조회', description: '모든 페이지를 조회합니다. (비공개 포함)' })
  @ApiResponse({ status: 200, description: '페이지 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  findAll() {
    return this.pagesService.findAllAdmin();
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '페이지 상세 조회',
    description: '관리자 편집용 페이지 상세를 조회합니다. (비공개 및 숨김 블록 포함)',
  })
  @ApiResponse({ status: 200, description: '페이지 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '페이지 ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOneAdmin(id);
  }
}
