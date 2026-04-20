import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { JournalCategory } from './entities/journal-entry.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('저널')
@Controller('journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '저널 목록 조회', description: '공개된 저널 목록을 조회합니다. 카테고리로 필터링할 수 있습니다.' })
  @ApiResponse({ status: 200, description: '저널 목록 조회 성공' })
  @ApiQuery({ name: 'category', required: false, enum: JournalCategory, description: '카테고리 필터' })
  @ApiQuery({ name: 'locale', required: false, description: '로케일 (ko|en)' })
  async getAllJournals(
    @Query('category') category?: JournalCategory,
    @Query('locale') locale?: string,
  ) {
    return this.journalService.findAll(category, locale);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: '저널 상세 조회', description: '슬러그로 저널 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '저널 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '저널을 찾을 수 없음' })
  @ApiQuery({ name: 'locale', required: false, description: '로케일 (ko|en)' })
  async getJournalBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return this.journalService.findBySlug(slug, locale);
  }
}
