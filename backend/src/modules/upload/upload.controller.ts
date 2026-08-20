import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createSingleFileMemoryUploadOptions } from '../../common/multer/single-file-upload.options';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_INPUT_FILE_SIZE_BYTES,
} from './upload.constants';
import { UploadService } from './upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadedFile as UploadedFileType } from './interfaces/storage.interface';
import { CmsImageImportDto } from './dto/cms-image.dto';
import { CmsMedia } from './upload.service';
import { CmsMediaKind } from './cms-media.constants';
import { RemoteImageIngestService } from './remote-image-ingest.service';

const IMAGE_UPLOAD_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
    },
  },
} as const;

const FILE_UPLOAD_INTERCEPTOR = FileInterceptor(
  'file',
  createSingleFileMemoryUploadOptions({
    fileSize: MAX_UPLOAD_INPUT_FILE_SIZE_BYTES,
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    invalidMimeMessage: '허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)',
  }),
);

@ApiTags('업로드')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly remoteImageIngestService: RemoteImageIngestService,
  ) {}

  @Post('image')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '이미지 업로드',
    description: '관리자가 이미지를 업로드합니다.',
  })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_UPLOAD_BODY_SCHEMA)
  @UseInterceptors(FILE_UPLOAD_INTERCEPTOR)
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadedFileType> {
    return this.uploadService.uploadImage(file);
  }

  @Post('category-image')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '카테고리 이미지 업로드',
    description: '관리자가 카테고리 이미지를 업로드합니다.',
  })
  @ApiResponse({ status: 201, description: '카테고리 이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_UPLOAD_BODY_SCHEMA)
  @UseInterceptors(FILE_UPLOAD_INTERCEPTOR)
  uploadCategoryImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadedFileType> {
    return this.uploadService.uploadCategoryImage(file);
  }

  @Post('cms-image')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'CMS 이미지 업로드',
    description: '히어로, 프로모션, 저널 용도의 원본과 WebP 파생 이미지를 생성합니다.',
  })
  @ApiResponse({ status: 201, description: 'CMS 이미지 업로드 성공' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'kind'],
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: ['hero', 'promotion', 'journal'] },
      },
    },
  })
  @UseInterceptors(FILE_UPLOAD_INTERCEPTOR)
  uploadCmsImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind: CmsMediaKind,
  ): Promise<CmsMedia> {
    return this.uploadService.uploadCmsImage(file, kind);
  }

  @Post('cms-image/import')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({
    summary: '기존 CMS 이미지 변환',
    description: '기존 원본 URL을 다운로드해 원본과 용도별 WebP 파생 이미지를 저장합니다.',
  })
  @ApiResponse({ status: 201, description: 'CMS 이미지 변환 성공' })
  importCmsImage(@Body() dto: CmsImageImportDto): Promise<CmsMedia> {
    return this.remoteImageIngestService.ingestCms(dto.url, dto.kind);
  }
}
