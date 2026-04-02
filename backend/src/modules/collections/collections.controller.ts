import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CollectionType } from './entities/collection.entity';

@ApiTags('컬렉션')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: '전체 컬렉션 조회', description: '도자기 유형과 형태 유형의 모든 컬렉션을 조회합니다.' })
  @ApiResponse({ status: 200, description: '컬렉션 목록 조회 성공' })
  async getAll() {
    const [clay, shape] = await Promise.all([
      this.collectionsService.findAllByType(CollectionType.CLAY),
      this.collectionsService.findAllByType(CollectionType.SHAPE),
    ]);
    return { clay, shape };
  }

  @Get('clay')
  @ApiOperation({ summary: '도자기 컬렉션 조회', description: '도자기 유형(clay)의 컬렉션만 조회합니다.' })
  @ApiResponse({ status: 200, description: '도자기 컬렉션 목록 조회 성공' })
  async getClayCollections() {
    return this.collectionsService.findAllByType(CollectionType.CLAY);
  }

  @Get('shape')
  @ApiOperation({ summary: '형태 컬렉션 조회', description: '형태 유형(shape)의 컬렉션만 조회합니다.' })
  @ApiResponse({ status: 200, description: '형태 컬렉션 목록 조회 성공' })
  async getShapeCollections() {
    return this.collectionsService.findAllByType(CollectionType.SHAPE);
  }
}
