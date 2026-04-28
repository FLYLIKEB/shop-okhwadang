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
  ApiCookieAuth,
} from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 저널')
@Controller('admin/journals')
@Roles('admin', 'super_admin')
export class AdminJournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '저널 목록 조회 (전체)', description: '모든 저널 목록을 조회합니다. 비공개 포함.' })
  @ApiResponse({ status: 200, description: '저널 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getAllJournals() {
    return this.journalService.findAllAdmin();
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '저널 상세 조회', description: '저널 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '저널 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '저널을 찾을 수 없음' })
  async getJournalById(@Param('id', ParseIntPipe) id: number) {
    return this.journalService.findById(id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '저널 생성', description: '새로운 저널을 생성합니다.' })
  @ApiResponse({ status: 201, description: '저널 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async createJournal(@Body() dto: CreateJournalDto) {
    return this.journalService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '저널 수정', description: '기존 저널 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '저널 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '저널을 찾을 수 없음' })
  async updateJournal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJournalDto,
  ) {
    return this.journalService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '저널 삭제', description: '저널을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '저널 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '저널을 찾을 수 없음' })
  async deleteJournal(@Param('id', ParseIntPipe) id: number) {
    await this.journalService.delete(id);
  }
}
