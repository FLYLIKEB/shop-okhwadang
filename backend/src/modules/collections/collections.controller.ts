import { Controller, Get, Query } from '@nestjs/common';
import { OptionalLocalePipe } from '../../common/pipes/optional-locale.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CollectionType } from './entities/collection.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('컬렉션')
@Controller('collections')
@Public()
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: '전체 컬렉션 조회', description: '도자기 유형과 형태 유형의 모든 컬렉션을 조회합니다.' })
  @ApiResponse({ status: 200, description: '컬렉션 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  async getAll(@Query('locale', OptionalLocalePipe) locale?: string) {
    const [clay, shape] = await Promise.all([
      this.collectionsService.findAllByType(CollectionType.CLAY, locale),
      this.collectionsService.findAllByType(CollectionType.SHAPE, locale),
    ]);
    return { clay, shape };
  }

  @Get('clay')
  @ApiOperation({ summary: '도자기 컬렉션 조회', description: '도자기 유형(clay)의 컬렉션만 조회합니다.' })
  @ApiResponse({ status: 200, description: '도자기 컬렉션 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  async getClayCollections(@Query('locale', OptionalLocalePipe) locale?: string) {
    return this.collectionsService.findAllByType(CollectionType.CLAY, locale);
  }

  @Get('shape')
  @ApiOperation({ summary: '형태 컬렉션 조회', description: '형태 유형(shape)의 컬렉션만 조회합니다.' })
  @ApiResponse({ status: 200, description: '형태 컬렉션 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  async getShapeCollections(@Query('locale', OptionalLocalePipe) locale?: string) {
    return this.collectionsService.findAllByType(CollectionType.SHAPE, locale);
  }
}
