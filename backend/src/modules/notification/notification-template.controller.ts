import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationTemplateService } from './notification-template.service';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { SolapiTemplateAdminService } from './solapi-template-admin.service';

@ApiTags('Admin notification templates')
@ApiCookieAuth()
@ApiResponse({ status: 403, description: '관리자 권한 필요' })
@Controller('admin/notification-templates')
@Roles('admin', 'super_admin')
export class NotificationTemplateController {
  constructor(private readonly templates: NotificationTemplateService, private readonly solapi: SolapiTemplateAdminService) {}

  @Get('alimtalk/:key/ko/provider')
  @ApiOperation({ summary: '알림톡 승인 상태 조회' })
  provider(@Param('key') key: string, @Query('templateId') templateId: string) {
    this.templates.definition('alimtalk', key, 'ko');
    return this.solapi.read(templateId);
  }

  @Post('alimtalk/:key/ko/revision')
  @ApiOperation({ summary: '알림톡 수정본 생성' })
  revision(@Param('key') key: string, @Body() input: UpdateNotificationTemplateDto) {
    return this.templates.createRevision(key, input);
  }

  @Post('alimtalk/:key/ko/inspection')
  @ApiOperation({ summary: '알림톡 검수 요청' })
  inspection(@Param('key') key: string, @Body('templateId') templateId: string) {
    this.templates.definition('alimtalk', key, 'ko');
    return this.solapi.requestInspection(templateId);
  }

  @Get()
  @ApiOperation({ summary: '알림 템플릿 조회' })
  list() { return this.templates.list(); }

  @Put(':channel/:key/:locale')
  @ApiOperation({ summary: '알림 템플릿 저장' })
  save(@Param('channel') channel: string, @Param('key') key: string, @Param('locale') locale: string, @Body() input: UpdateNotificationTemplateDto) {
    return this.templates.save(channel, key, locale, input);
  }

  @Post(':channel/:key/:locale/preview')
  @ApiOperation({ summary: '가상 데이터로 알림 미리보기' })
  preview(@Param('channel') channel: string, @Param('key') key: string, @Param('locale') locale: string, @Body() input: UpdateNotificationTemplateDto) {
    return this.templates.preview(channel, key, locale, input);
  }
}
