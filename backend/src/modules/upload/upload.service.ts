import {
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly adapter: StorageAdapter;

  constructor(
    localAdapter: LocalStorageAdapter,
    mockAdapter: MockStorageAdapter,
    s3Adapter: S3StorageAdapter,
  ) {
    const provider = process.env.STORAGE_PROVIDER ?? 'local';
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

  async uploadImage(file: Express.Multer.File): Promise<UploadedFile> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException('파일 크기는 5MB를 초과할 수 없습니다.');
    }

    const detectedMime = detectMimeFromMagicBytes(file.buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException('허용되지 않는 이미지 형식입니다.');
    }

    const ext = path.extname(file.originalname).toLowerCase() || `.${file.mimetype.split('/')[1]}`;
    const filename = `${randomUUID()}${ext}`;

    const resized = await sharp(file.buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    return this.adapter.save(filename, resized, file.mimetype);
  }
}

function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
