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
import { FaqsService } from './faqs.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('FAQ')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'FAQ 목록 조회', description: 'FAQ 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: 'FAQ 목록 조회 성공' })
  @ApiQuery({ name: 'category', required: false, type: String, description: '카테고리' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: ' locale (ko/en)' })
  findAll(@Query() query: FaqQueryDto) {
    return this.faqsService.findAll(query);
  }
}

@ApiTags('관리자 - FAQ')
@Controller('admin/faqs')
@Roles('admin', 'super_admin')
export class AdminFaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'FAQ 전체 조회 (관리자)', description: '발행 여부 상관없이 모든 FAQ를 조회합니다.' })
  @ApiResponse({ status: 200, description: 'FAQ 목록 조회 성공' })
  findAll() {
    return this.faqsService.findAllForAdmin();
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'FAQ 생성', description: '새로운 FAQ를 생성합니다.' })
  @ApiResponse({ status: 201, description: 'FAQ 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateFaqDto) {
    return this.faqsService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'FAQ 수정', description: '기존 FAQ를 수정합니다.' })
  @ApiResponse({ status: 200, description: 'FAQ 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'FAQ를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: 'FAQ ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqDto) {
    return this.faqsService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'FAQ 삭제', description: 'FAQ를 삭제합니다.' })
  @ApiResponse({ status: 200, description: 'FAQ 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'FAQ를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: 'FAQ ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.faqsService.remove(id);
  }
}
