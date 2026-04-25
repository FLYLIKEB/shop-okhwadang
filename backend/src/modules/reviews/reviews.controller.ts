import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedRequestWithAuthUser } from '../../common/interfaces/auth-user.interface';
import { UploadService } from '../upload/upload.service';

const REVIEW_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const REVIEW_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('후기')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly uploadService: UploadService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '후기 목록 조회', description: '후기 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '후기 목록 조회 성공' })
  @ApiQuery({ name: 'productId', required: false, type: Number, description: '상품 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '후기 생성', description: '새로운 후기를 작성합니다.' })
  @ApiResponse({ status: 201, description: '후기 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  create(
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Post('upload-image')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiCookieAuth()
  @ApiOperation({ summary: '후기 이미지 업로드', description: '후기에 사용할 이미지를 업로드합니다. (jpg, png, webp만 허용, 최대 10MB)' })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 400, description: '파일 없음 또는 잘못된 파일 형식' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }

    if (!REVIEW_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('허용되지 않는 파일 형식입니다. (jpg, png, webp만 허용)');
    }

    if (file.size > REVIEW_MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 10MB 이하여야 합니다.');
    }

    return this.uploadService.uploadImage(file);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '후기 수정', description: '작성한 후기를 수정합니다.' })
  @ApiResponse({ status: 200, description: '후기 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '본인 후기가 아니지 않음' })
  @ApiResponse({ status: 404, description: '후기를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '후기 ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '후기 삭제', description: '후기를 삭제합니다.' })
  @ApiResponse({ status: 200, description: '후기 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '본인 후기가 아니지 않음' })
  @ApiResponse({ status: 404, description: '후기를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '후기 ID' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequestWithAuthUser,
  ) {
    return this.reviewsService.remove(id, req.user.id, req.user.role);
  }
}
