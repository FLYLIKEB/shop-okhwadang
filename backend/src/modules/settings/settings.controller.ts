import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  findAll(@Query('group') group?: string) {
    return this.settingsService.findAll(group);
  }

  @Public()
  @Get('map')
  getMap() {
    return this.settingsService.getMap();
  }
}

@Controller('admin/settings')
@Roles('admin', 'super_admin')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Put()
  bulkUpdate(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.bulkUpdate(dto.settings);
  }

  @Post('reset')
  resetToDefaults() {
    return this.settingsService.resetToDefaults();
  }
}
