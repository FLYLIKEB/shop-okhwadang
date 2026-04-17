import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

const POPULAR_SEARCH_KEYWORDS = ['자사호', '보이차', '다구', '찻잔', '개완', '숙차', '생차', '다반'] as const;

@ApiTags('검색')
@Controller('search')
export class SearchController {
  @Get('popular')
  @Public()
  @ApiOperation({ summary: '인기 검색어 조회', description: '현재 인기 있는 검색어 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '인기 검색어 조회 성공' })
  popular(): { keywords: readonly string[] } {
    return { keywords: POPULAR_SEARCH_KEYWORDS };
  }
}
