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
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  async getAll() {
    return this.collectionsService.findAll();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.collectionsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.collectionsService.remove(id);
  }

  @Patch('reorder')
  async reorder(@Body() items: { id: number; sortOrder: number }[]) {
    await this.collectionsService.reorder(items);
  }
}
