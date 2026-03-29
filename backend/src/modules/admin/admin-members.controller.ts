import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminMembersService } from './admin-members.service';
import { AdminMembersQueryDto } from './dto/admin-members-query.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UserRole } from '../users/entities/user.entity';

interface RequestWithUser {
  user: { id: number; email: string; role: string };
}

@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminMembersController {
  constructor(private readonly adminMembersService: AdminMembersService) {}

  @Get('members')
  findAll(@Query() query: AdminMembersQueryDto) {
    return this.adminMembersService.findAll(query);
  }

  @Patch('members/:id')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: RequestWithUser,
  ) {
    return this.adminMembersService.updateRole(
      id,
      dto.role as UserRole,
      req.user.id,
      req.user.role as UserRole,
    );
  }
}
