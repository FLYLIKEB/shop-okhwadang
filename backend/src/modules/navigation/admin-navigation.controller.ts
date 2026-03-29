import { Controller, Get, Query } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/navigation')
@Roles('admin', 'super_admin')
export class AdminNavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  findAll(@Query('group') group: 'gnb' | 'sidebar' | 'footer') {
    return this.navigationService.findAllByGroup(group);
  }
}
