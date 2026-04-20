import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('설정')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '설정 목록 조회', description: '설정 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '설정 목록 조회 성공' })
  @ApiQuery({ name: 'group', required: false, type: String, description: '설정 그룹 필터' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: '언어 코드 (ko|en)' })
  findAll(@Query('group') group?: string, @Query('locale') locale?: string) {
    return this.settingsService.findAll(group, locale);
  }

  @Public()
  @Get('map')
  @ApiOperation({ summary: '설정 맵 조회', description: '설정을 key-value 맵으로 조회합니다.' })
  @ApiResponse({ status: 200, description: '설정 맵 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: '언어 코드 (ko|en)' })
  getMap(@Query('locale') locale?: string) {
    return this.settingsService.getMap(locale);
  }
}

@ApiTags('관리자 - 설정')
@Controller('admin/settings')
@Roles('admin', 'super_admin')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '설정 목록 조회 (관리자)', description: '관리자용 설정 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '설정 목록 조회 성공' })
  @ApiQuery({ name: 'group', required: false, type: String, description: '설정 그룹 필터' })
  findAll(@Query('group') group?: string) {
    return this.settingsService.findAll(group);
  }

  @Put()
  @ApiCookieAuth()
  @ApiOperation({ summary: '설정 일괄 수정', description: '여러 설정을 한 번에 수정합니다.' })
  @ApiResponse({ status: 200, description: '설정 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  bulkUpdate(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.bulkUpdate(dto.settings);
  }

  @Post('reset')
  @ApiCookieAuth()
  @ApiOperation({ summary: '설정 초기화', description: '모든 설정을 기본값으로 초기화합니다.' })
  @ApiResponse({ status: 200, description: '설정 초기화 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  resetToDefaults() {
    return this.settingsService.resetToDefaults();
  }
}
