import {
  Inject,
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import sharp from 'sharp';
import { StorageAdapter, UploadedFile } from './interfaces/storage.interface';
import { LocalStorageAdapter } from './adapters/local.adapter';
import { MockStorageAdapter } from './adapters/mock.adapter';
import { S3StorageAdapter } from './adapters/s3.adapter';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_IMAGE_HEIGHT,
  MAX_UPLOAD_IMAGE_WIDTH,
} from './upload.constants';
import {
  STORAGE_CONFIG,
  StorageConfig,
} from '../../config/storage.config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly adapter: StorageAdapter;

  constructor(
    @Inject(STORAGE_CONFIG)
    storageConfig: StorageConfig,
    localAdapter: LocalStorageAdapter,
    mockAdapter: MockStorageAdapter,
    s3Adapter: S3StorageAdapter,
  ) {
    const provider = storageConfig.provider;
    switch (provider) {
      case 's3':
        this.adapter = s3Adapter;
        break;
      case 'mock':
        this.adapter = mockAdapter;
        break;
      default:
        this.adapter = localAdapter;
    }
    this.logger.log(`StorageAdapter: ${provider}`);
  }

  uploadImage(file: Express.Multer.File): Promise<UploadedFile> {
    return this.uploadWithPipeline(file, (filename, buffer, mimetype) =>
      this.adapter.save(filename, buffer, mimetype),
    );
  }

  uploadCategoryImage(file: Express.Multer.File): Promise<UploadedFile> {
    return this.uploadWithPipeline(file, (filename, buffer, mimetype) =>
      this.adapter.saveCategoryImage(filename, buffer, mimetype),
    );
  }

  private async uploadWithPipeline(
    file: Express.Multer.File,
    save: (filename: string, buffer: Buffer, mimetype: string) => Promise<UploadedFile>,
  ): Promise<UploadedFile> {
    this.validateFile(file);

    const ext =
      path.extname(file.originalname).toLowerCase() ||
      `.${file.mimetype.split('/')[1]}`;
    const filename = `${randomUUID()}${ext}`;

    const resized = await sharp(file.buffer)
      .resize(MAX_UPLOAD_IMAGE_WIDTH, MAX_UPLOAD_IMAGE_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    return save(filename, resized, file.mimetype);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!isAllowedImageMimeType(file.mimetype)) {
      throw new BadRequestException(
        '허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)',
      );
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException('파일 크기는 5MB를 초과할 수 없습니다.');
    }

    const detectedMime = detectMimeFromMagicBytes(file.buffer);
    if (!detectedMime || !isAllowedImageMimeType(detectedMime)) {
      throw new BadRequestException('허용되지 않는 이미지 형식입니다.');
    }
  }
}

function isAllowedImageMimeType(mimeType: string): mimeType is (typeof ALLOWED_IMAGE_MIME_TYPES)[number] {
  return ALLOWED_IMAGE_MIME_TYPES.some((allowedType) => allowedType === mimeType);
}

function detectMimeFromMagicBytes(
  buffer: Buffer,
): (typeof ALLOWED_IMAGE_MIME_TYPES)[number] | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
