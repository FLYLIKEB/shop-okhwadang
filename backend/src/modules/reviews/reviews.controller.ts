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
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UploadService } from '../upload/upload.service';

interface JwtUser {
  id: number;
  role: string;
}

const REVIEW_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const REVIEW_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly uploadService: UploadService,
  ) {}

  @Public()
  @Get()
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Post()
  create(
    @Request() req: { user: JwtUser },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Post('upload-image')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.reviewsService.remove(id, req.user.id, req.user.role);
  }
}
