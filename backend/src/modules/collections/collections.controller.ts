import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionType } from './entities/collection.entity';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  async getAll() {
    const [clay, shape] = await Promise.all([
      this.collectionsService.findAllByType(CollectionType.CLAY),
      this.collectionsService.findAllByType(CollectionType.SHAPE),
    ]);
    return { clay, shape };
  }

  @Get('clay')
  async getClayCollections() {
    return this.collectionsService.findAllByType(CollectionType.CLAY);
  }

  @Get('shape')
  async getShapeCollections() {
    return this.collectionsService.findAllByType(CollectionType.SHAPE);
  }
}
