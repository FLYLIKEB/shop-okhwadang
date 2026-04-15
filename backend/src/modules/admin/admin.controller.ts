import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자')
@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
}
