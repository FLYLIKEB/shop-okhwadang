import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createSingleFileMemoryUploadOptions } from '../../common/multer/single-file-upload.options';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import {
  BulkUpdateReviewVisibilityDto,
  UpdateReviewVisibilityDto,
} from './dto/update-review-visibility.dto';
import { AdminReviewsService } from './admin-reviews.service';
import { SmartStoreReviewImportService } from './smartstore-review-import.service';

const REVIEW_IMPORT_INTERCEPTOR = FileInterceptor(
  'file',
  createSingleFileMemoryUploadOptions({ fileSize: 10 * 1024 * 1024 }),
);

@ApiTags('관리자 - 리뷰')
@Controller('admin/reviews')
@Roles('admin', 'super_admin')
export class AdminReviewsController {
  constructor(
    private readonly adminReviewsService: AdminReviewsService,
    private readonly smartStoreReviewImportService: SmartStoreReviewImportService,
  ) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({
    summary: '관리자 리뷰 목록 조회',
    description: '스마트스토어 외부 리뷰를 검색/필터링하여 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '관리자 리뷰 목록 조회 성공' })
  findAll(@Query() query: AdminReviewQueryDto) {
    return this.adminReviewsService.findAll(query);
  }

  @Post('imports/smartstore/preview')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '스마트스토어 리뷰 엑셀 미리보기',
    description: '스마트스토어 리뷰 엑셀 파일을 검증하고 상품 매칭/반영 예정 내역을 반환합니다.',
  })
  @ApiResponse({ status: 201, description: '리뷰 가져오기 미리보기 성공' })
  @ApiResponse({ status: 400, description: '잘못된 파일 또는 리뷰 데이터' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(REVIEW_IMPORT_INTERCEPTOR)
  previewSmartStoreImport(@UploadedFile() file: Express.Multer.File) {
    return this.smartStoreReviewImportService.preview(file);
  }

  @Post('imports/smartstore/commit')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '스마트스토어 리뷰 엑셀 반영',
    description:
      '검증된 스마트스토어 리뷰 엑셀 파일을 상품에 연결하고 사진을 S3/스토리지에 적재합니다.',
  })
  @ApiResponse({ status: 201, description: '리뷰 가져오기 반영 성공' })
  @ApiResponse({ status: 400, description: '잘못된 파일 또는 리뷰 데이터' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(REVIEW_IMPORT_INTERCEPTOR)
  commitSmartStoreImport(@UploadedFile() file: Express.Multer.File) {
    return this.smartStoreReviewImportService.commit(file);
  }

  @Post('bulk-visibility')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '리뷰 일괄 숨김/노출 처리' })
  @ApiResponse({ status: 200, description: '일괄 처리 성공' })
  bulkSetVisibility(@Body() dto: BulkUpdateReviewVisibilityDto) {
    return this.adminReviewsService.bulkSetVisibility(dto.ids, dto.isVisible);
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '관리자 리뷰 상세 조회' })
  @ApiResponse({ status: 200, description: '관리자 리뷰 상세 조회 성공' })
  @ApiParam({ name: 'id', type: Number, description: '외부 리뷰 ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminReviewsService.findOne(id);
  }

  @Patch(':id/visibility')
  @ApiCookieAuth()
  @ApiOperation({ summary: '리뷰 숨김/노출 처리' })
  @ApiResponse({ status: 200, description: '리뷰 숨김/노출 처리 성공' })
  @ApiParam({ name: 'id', type: Number, description: '외부 리뷰 ID' })
  setVisibility(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewVisibilityDto) {
    return this.adminReviewsService.setVisibility(id, dto.isVisible);
  }
}
