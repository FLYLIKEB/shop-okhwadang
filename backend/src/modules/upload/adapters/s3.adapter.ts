import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';
import { STORAGE_CONFIG, StorageConfig } from '../../../config/storage.config';

@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnUrl: string | null;

  constructor(
    @Inject(STORAGE_CONFIG)
    config: StorageConfig,
  ) {
    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
    this.cdnUrl = config.s3.cdnUrl;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });

    this.logger.log(`S3 adapter initialized: bucket=${this.bucket}, region=${this.region}`);
  }

  async save(filename: string, buffer: Buffer, mimetype: string): Promise<UploadedFile> {
    return this.saveToFolder(filename, buffer, mimetype, 'products');
  }

  async saveCategoryImage(filename: string, buffer: Buffer, mimetype: string): Promise<UploadedFile> {
    return this.saveToFolder(filename, buffer, mimetype, 'categories');
  }

  private async saveToFolder(filename: string, buffer: Buffer, mimetype: string, folder: string): Promise<UploadedFile> {
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ACL: 'public-read' as const,
      }),
    );

    const url = this.cdnUrl
      ? `${this.cdnUrl}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    this.logger.debug(`Uploaded to S3: ${url}`);
    return { url, filename: key };
  }

  async delete(filename: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      }),
    );
    this.logger.debug(`Deleted from S3: ${filename}`);
  }
}
