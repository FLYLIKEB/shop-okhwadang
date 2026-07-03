import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  type S3ClientConfig,
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
  private readonly publicUrlCheckTimeoutMs = 3_000;

  constructor(
    @Inject(STORAGE_CONFIG)
    config: StorageConfig,
  ) {
    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
    this.cdnUrl = config.s3.cdnUrl;

    const clientConfig: S3ClientConfig = { region: this.region };
    if (config.s3.accessKeyId && config.s3.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);

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

    const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    const url = await this.resolvePublicUrl(key, s3Url);

    this.logger.debug(`Uploaded to S3: ${url}`);
    return { url, filename: key };
  }

  private async resolvePublicUrl(key: string, s3Url: string): Promise<string> {
    if (!this.cdnUrl) {
      return s3Url;
    }

    const cdnUrl = `${this.cdnUrl}/${key}`;
    if (await this.isReachable(cdnUrl)) {
      return cdnUrl;
    }

    this.logger.warn(`CDN URL is not reachable after upload; falling back to S3 URL: ${cdnUrl}`);
    return s3Url;
  }

  private async isReachable(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.publicUrlCheckTimeoutMs),
      });
      return response.ok;
    } catch {
      return false;
    }
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
