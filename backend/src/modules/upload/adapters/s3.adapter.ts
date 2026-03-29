import { Injectable } from '@nestjs/common';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';

/**
 * S3 Storage Adapter — stub implementation.
 * Configure AWS_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars.
 */
@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  async save(filename: string, _buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    const bucket = process.env.AWS_BUCKET_NAME ?? 'commerce-uploads';
    const region = process.env.AWS_REGION ?? 'ap-northeast-2';
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
    return { url, filename };
  }
}
