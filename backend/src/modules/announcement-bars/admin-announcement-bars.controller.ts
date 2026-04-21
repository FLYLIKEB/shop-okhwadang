import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnnouncementBarsService } from './announcement-bars.service';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';
import { ReorderAnnouncementBarsDto } from './dto/reorder-announcement-bars.dto';

@ApiTags('관리자 - 안내 바')
@Controller('admin/announcement-bars')
@Roles('admin', 'super_admin')
export class AdminAnnouncementBarsController {
  constructor(private readonly announcementBarsService: AnnouncementBarsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '안내 바 전체 목록 조회 (관리자)' })
  @ApiResponse({ status: 200, description: '안내 바 전체 목록 조회 성공' })
  findAll() {
    return this.announcementBarsService.findAll();
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '안내 바 생성' })
  @ApiResponse({ status: 201, description: '안내 바 생성 성공' })
  create(@Body() dto: CreateAnnouncementBarDto) {
    return this.announcementBarsService.create(dto);
  }

  @Patch('reorder')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '안내 바 정렬 순서 변경' })
  @ApiResponse({ status: 204, description: '안내 바 정렬 순서 변경 성공' })
  reorder(@Body() dto: ReorderAnnouncementBarsDto) {
    return this.announcementBarsService.reorder(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '안내 바 수정' })
  @ApiResponse({ status: 200, description: '안내 바 수정 성공' })
  @ApiParam({ name: 'id', type: Number, description: '안내 바 ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementBarDto,
  ) {
    return this.announcementBarsService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '안내 바 삭제' })
  @ApiResponse({ status: 204, description: '안내 바 삭제 성공' })
  @ApiParam({ name: 'id', type: Number, description: '안내 바 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.announcementBarsService.remove(id);
  }
}
