import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderNavigationDto } from './dto/reorder-navigation.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @Public()
  findByGroup(@Query('group') group: 'gnb' | 'sidebar' | 'footer') {
    return this.navigationService.findActiveByGroup(group);
  }

  @Post()
  @Roles('admin', 'super_admin')
  create(@Body() dto: CreateNavigationItemDto) {
    return this.navigationService.create(dto);
  }

  @Patch('reorder')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderNavigationDto) {
    return this.navigationService.reorder(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNavigationItemDto,
  ) {
    return this.navigationService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.navigationService.remove(id);
  }
}
