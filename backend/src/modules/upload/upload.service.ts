import {
  Inject,
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  Logger,
  InternalServerErrorException,
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
  MAX_UPLOAD_INPUT_FILE_SIZE_BYTES,
  MAX_UPLOAD_INPUT_FILE_SIZE_LABEL,
  MAX_UPLOAD_IMAGE_HEIGHT,
  MAX_UPLOAD_IMAGE_WIDTH,
} from './upload.constants';
import {
  STORAGE_CONFIG,
  StorageConfig,
} from '../../config/storage.config';
import {
  CMS_MEDIA_VARIANTS,
  CMS_MEDIA_WIDTHS,
  CmsMediaKind,
  isCmsMediaKind,
} from './cms-media.constants';

export interface CmsMedia {
  original: UploadedFile;
  derivatives: Record<string, UploadedFile>;
}

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
        if (!isCompleteS3Config(storageConfig)) {
          const message = 'STORAGE_PROVIDER=s3 requires AWS_S3_BUCKET_NAME (or AWS_S3_BUCKET). Configure AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or an EC2 IAM role for credentials.';
          if (process.env.NODE_ENV === 'production') {
            throw new Error(message);
          }
          this.logger.warn(`${message} Falling back to local storage in non-production.`);
          this.adapter = localAdapter;
          break;
        }
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

  uploadImage(file: Express.Multer.File | undefined): Promise<UploadedFile> {
    return this.uploadWithPipeline(file, 'save');
  }

  uploadCategoryImage(file: Express.Multer.File | undefined): Promise<UploadedFile> {
    return this.uploadWithPipeline(file, 'saveCategoryImage');
  }

  uploadImageBuffer(buffer: Buffer, originalname: string): Promise<UploadedFile> {
    const file = this.createFileFromBuffer(buffer, originalname);
    return this.uploadWithPipeline(file, 'save');
  }

  uploadOriginalImageBuffer(buffer: Buffer, originalname: string): Promise<UploadedFile> {
    const file = this.createFileFromBuffer(buffer, originalname);
    return this.uploadOriginal(file, 'save');
  }

  async uploadCmsImage(
    file: Express.Multer.File | undefined,
    kind: string,
  ): Promise<CmsMedia> {
    this.validateCmsKind(kind);
    this.validateFile(file);
    return this.uploadCmsFile(file, kind);
  }

  async uploadCmsImageBuffer(
    buffer: Buffer,
    originalname: string,
    kind: string,
  ): Promise<CmsMedia> {
    this.validateCmsKind(kind);
    const file = this.createFileFromBuffer(buffer, originalname);
    this.validateFile(file);
    return this.uploadCmsFile(file, kind);
  }

  private createFileFromBuffer(buffer: Buffer, originalname: string): Express.Multer.File {
    const detectedMime = detectMimeFromMagicBytes(buffer);
    if (!detectedMime) {
      throw new BadRequestException(
        '허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)',
      );
    }

    return {
      buffer,
      originalname,
      mimetype: detectedMime,
      size: buffer.length,
    } as Express.Multer.File;
  }

  private async uploadWithPipeline(
    file: Express.Multer.File | undefined,
    saveMethod: 'save' | 'saveCategoryImage',
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

    try {
      return await this.adapter[saveMethod](filename, resized, file.mimetype);
    } catch (err) {
      if (isAwsCredentialError(err)) {
        throw new InternalServerErrorException(
          '이미지 저장소 인증 정보가 올바르지 않습니다. AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 또는 STORAGE_PROVIDER 설정을 확인해 주세요.',
        );
      }
      throw err;
    }
  }

  private async uploadOriginal(
    file: Express.Multer.File,
    saveMethod: 'save' | 'saveCategoryImage',
  ): Promise<UploadedFile> {
    this.validateFile(file);

    const ext =
      path.extname(file.originalname).toLowerCase() ||
      `.${file.mimetype.split('/')[1]}`;
    const filename = `${randomUUID()}${ext}`;

    try {
      return await this.adapter[saveMethod](filename, file.buffer, file.mimetype);
    } catch (err) {
      if (isAwsCredentialError(err)) {
        throw new InternalServerErrorException(
          '이미지 저장소 인증 정보가 올바르지 않습니다. AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 또는 STORAGE_PROVIDER 설정을 확인해 주세요.',
        );
      }
      throw err;
    }
  }

  private async uploadCmsFile(
    file: Express.Multer.File,
    kind: CmsMediaKind,
  ): Promise<CmsMedia> {
    const extension = path.extname(file.originalname).toLowerCase() || `.${file.mimetype.split('/')[1]}`;
    const id = randomUUID();
    const original = await this.saveCmsFile(
      `${id}${extension}`,
      file.buffer,
      file.mimetype,
      `${kind}/original`,
    );
    const derivatives: Record<string, UploadedFile> = {};

    for (const variant of CMS_MEDIA_VARIANTS[kind]) {
      const derivative = await sharp(file.buffer)
        .resize(CMS_MEDIA_WIDTHS[kind][variant], undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
      derivatives[variant] = await this.saveCmsFile(
        `${id}.webp`,
        derivative,
        'image/webp',
        `${kind}/${variant}`,
      );
    }

    return { original, derivatives };
  }

  private async saveCmsFile(
    filename: string,
    buffer: Buffer,
    mimetype: string,
    variant: string,
  ): Promise<UploadedFile> {
    try {
      return await this.adapter.saveCmsImage(filename, buffer, mimetype, variant);
    } catch (err) {
      if (isAwsCredentialError(err)) {
        throw new InternalServerErrorException(
          '이미지 저장소 인증 정보가 올바르지 않습니다. AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 또는 STORAGE_PROVIDER 설정을 확인해 주세요.',
        );
      }
      throw err;
    }
  }

  private validateCmsKind(kind: string): asserts kind is CmsMediaKind {
    if (!isCmsMediaKind(kind)) {
      throw new BadRequestException('CMS 이미지 용도는 hero, promotion, journal 중 하나여야 합니다.');
    }
  }

  private validateFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('업로드할 파일을 첨부해주세요.');
    }

    if (!isAllowedImageMimeType(file.mimetype)) {
      throw new BadRequestException(
        '허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)',
      );
    }

    if (file.size > MAX_UPLOAD_INPUT_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `파일 크기는 ${MAX_UPLOAD_INPUT_FILE_SIZE_LABEL}를 초과할 수 없습니다.`,
      );
    }

    const detectedMime = detectMimeFromMagicBytes(file.buffer);
    if (!detectedMime || !isAllowedImageMimeType(detectedMime)) {
      throw new BadRequestException('허용되지 않는 이미지 형식입니다.');
    }
  }
}

function isCompleteS3Config(config: StorageConfig): boolean {
  return Boolean(config.s3.bucket.trim());
}

function isAwsCredentialError(err: unknown): boolean {
  return err instanceof Error &&
    /Access Key \(AKID\)|authorization header is malformed|credential/i.test(err.message);
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
