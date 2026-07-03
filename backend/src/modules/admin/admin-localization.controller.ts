import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminLocalizationService } from './admin-localization.service';

@ApiTags('관리자 - 번역 상태')
@Controller('admin/localization')
@Roles('admin', 'super_admin')
export class AdminLocalizationController {
  constructor(private readonly adminLocalizationService: AdminLocalizationService) {}

  @Get('coverage')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '스토어 데이터 번역 상태 조회',
    description: '영문 스토어에서 한국어 fallback 또는 원문 fallback이 발생할 사용자 노출 데이터를 집계합니다.',
  })
  @ApiResponse({ status: 200, description: '번역 상태 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  getCoverage() {
    return this.adminLocalizationService.getCoverage();
  }
}
