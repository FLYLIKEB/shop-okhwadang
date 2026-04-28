import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeQueryDto } from './dto/notice-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('공지사항')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '공지사항 목록 조회', description: '공지사항 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: ' locale (ko/en)' })
  findAll(@Query() query: NoticeQueryDto) {
    return this.noticesService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '공지사항 상세 조회', description: '공지사항 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공지사항 ID' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: ' locale (ko/en)' })
  findOne(@Param('id', ParseIntPipe) id: number, @Query() query: NoticeQueryDto) {
    return this.noticesService.findOne(id, query.locale);
  }
}

@ApiTags('관리자 - 공지사항')
@Controller('admin/notices')
@Roles('admin', 'super_admin')
export class AdminNoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '공지사항 생성', description: '새로운 공지사항을 생성합니다.' })
  @ApiResponse({ status: 201, description: '공지사항 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateNoticeDto) {
    return this.noticesService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공지사항 수정', description: '기존 공지사항을 수정합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공지사항 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNoticeDto) {
    return this.noticesService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공지사항 삭제', description: '공지사항을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공지사항 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.noticesService.remove(id);
  }
}
