import { Controller, Get } from '@nestjs/common';
import { PagesService } from './pages.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/pages')
@Roles('admin', 'super_admin')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  findAll() {
    return this.pagesService.findAllAdmin();
  }
}
