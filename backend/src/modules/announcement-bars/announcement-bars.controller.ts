import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AnnouncementBarsService } from './announcement-bars.service';

@ApiTags('안내 바')
@Controller('announcement-bars')
export class AnnouncementBarsController {
  constructor(private readonly announcementBarsService: AnnouncementBarsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '활성 안내 바 목록 조회' })
  @ApiResponse({ status: 200, description: '활성 안내 바 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, enum: ['ko', 'en'] })
  findActive(@Query('locale') locale?: string) {
    return this.announcementBarsService.findActive(locale);
  }
}
