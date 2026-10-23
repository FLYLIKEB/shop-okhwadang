import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PopupsService } from './popups.service';

@ApiTags('팝업')
@Controller('popups')
export class PopupsController {
  constructor(private readonly popupsService: PopupsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '현재 노출 중인 팝업 목록' })
  @ApiResponse({ status: 200, description: '활성 기간에 해당하는 팝업 목록' })
  findActive() {
    return this.popupsService.findActive();
  }
}
