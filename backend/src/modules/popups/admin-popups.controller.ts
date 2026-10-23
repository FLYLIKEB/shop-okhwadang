import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePopupDto, UpdatePopupDto } from './dto/create-popup.dto';
import { PopupsService } from './popups.service';

@ApiTags('관리자 - 팝업')
@ApiCookieAuth()
@Roles('admin', 'super_admin')
@Controller('admin/popups')
export class AdminPopupsController {
  constructor(private readonly popupsService: PopupsService) {}

  @Get()
  @ApiOperation({ summary: '팝업 전체 목록' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  findAll() {
    return this.popupsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '팝업 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  create(@Body() dto: CreatePopupDto) {
    return this.popupsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '팝업 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePopupDto) {
    return this.popupsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '팝업 삭제' })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.remove(id);
  }
}
