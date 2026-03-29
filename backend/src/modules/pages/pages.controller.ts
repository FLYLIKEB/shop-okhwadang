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
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { UpdatePageBlockDto } from './dto/update-page-block.dto';
import { ReorderBlocksDto } from './dto/reorder-blocks.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @Public()
  findAllPublished() {
    return this.pagesService.findAllPublished();
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Post()
  @Roles('admin', 'super_admin')
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.remove(id);
  }

  @Post(':pageId/blocks')
  @Roles('admin', 'super_admin')
  createBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() dto: CreatePageBlockDto,
  ) {
    return this.pagesService.createBlock(pageId, dto);
  }

  @Patch(':pageId/blocks/reorder')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorderBlocks(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() dto: ReorderBlocksDto,
  ) {
    return this.pagesService.reorderBlocks(pageId, dto);
  }

  @Patch(':pageId/blocks/:blockId')
  @Roles('admin', 'super_admin')
  updateBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() dto: UpdatePageBlockDto,
  ) {
    return this.pagesService.updateBlock(pageId, blockId, dto);
  }

  @Delete(':pageId/blocks/:blockId')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBlock(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.pagesService.removeBlock(pageId, blockId);
  }
}
