import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { UpdatePageBlockDto } from './dto/update-page-block.dto';
import { ReorderBlocksDto } from './dto/reorder-blocks.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('페이지')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '公開ページ 목록 조회', description: '公開中のページ 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: 'ページ 목록 조회 성공' })
  findAllPublished() {
    return this.pagesService.findAllPublished();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: '페이지 상세 조회', description: '페이지 슬러그로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '페이지 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'slug', type: String, description: '페이지 슬러그' })
  findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '페이지 생성', description: '새로운 페이지를 생성합니다.' })
  @ApiResponse({ status: 201, description: '페이지 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '페이지 수정', description: '기존 페이지 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '페이지 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '페이지 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '페이지 삭제', description: '페이지를 삭제합니다.' })
  @ApiResponse({ status: 204, description: '페이지 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '페이지 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.remove(id);
  }

  @Post(':pageId/blocks')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '페이지 블록 생성', description: '페이지에 새로운 블록을 추가합니다.' })
  @ApiResponse({ status: 201, description: '페이지 블록 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'pageId', type: Number, description: '페이지 ID' })
  createBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() dto: CreatePageBlockDto,
  ) {
    return this.pagesService.createBlock(pageId, dto);
  }

  @Patch(':pageId/blocks/reorder')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '페이지 블록 순서 변경', description: '페이지 내 블록들의 순서를 변경합니다.' })
  @ApiResponse({ status: 204, description: '페이지 블록 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음' })
  @ApiParam({ name: 'pageId', type: Number, description: '페이지 ID' })
  reorderBlocks(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() dto: ReorderBlocksDto,
  ) {
    return this.pagesService.reorderBlocks(pageId, dto);
  }

  @Patch(':pageId/blocks/:blockId')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '페이지 블록 수정', description: '페이지 내 블록 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '페이지 블록 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지 또는 블록을 찾을 수 없음' })
  @ApiParam({ name: 'pageId', type: Number, description: '페이지 ID' })
  @ApiParam({ name: 'blockId', type: Number, description: '블록 ID' })
  updateBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() dto: UpdatePageBlockDto,
  ) {
    return this.pagesService.updateBlock(pageId, blockId, dto);
  }

  @Delete(':pageId/blocks/:blockId')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '페이지 블록 삭제', description: '페이지 내 블록을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '페이지 블록 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '페이지 또는 블록을 찾을 수 없음' })
  @ApiParam({ name: 'pageId', type: Number, description: '페이지 ID' })
  @ApiParam({ name: 'blockId', type: Number, description: '블록 ID' })
  removeBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.pagesService.removeBlock(pageId, blockId);
  }
}
