import {
  Controller,
  Post,
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
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadedFile as UploadedFileType } from './interfaces/storage.interface';

@ApiTags('업로드')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이미지 업로드', description: '관리자가 이미지를 업로드합니다.' })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadedFileType> {
    return this.uploadService.uploadImage(file);
  }

  @Post('category-image')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '카테고리 이미지 업로드', description: '관리자가 카테고리 이미지를 업로드합니다.' })
  @ApiResponse({ status: 201, description: '카테고리 이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadCategoryImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadedFileType> {
    return this.uploadService.uploadCategoryImage(file);
  }
}
