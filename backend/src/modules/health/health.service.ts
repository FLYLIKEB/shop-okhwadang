import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export interface DependencyStatus {
  status: 'connected' | 'disconnected';
  reason?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  db: DependencyStatus;
  storage: 'connected' | 'disconnected' | 'skipped' | 'unknown';
  storageReason?: string;
  uptime: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async liveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();

    try {
      await this.checkDatabase();
    } catch (error) {
      const reason = this.getDatabaseFailureReason(error);
      this.logger.error(`Health check failed: database ${reason}`);
      throw new ServiceUnavailableException({
        status: 'error',
        db: { status: 'disconnected', reason },
        storage: 'unknown',
        uptime: process.uptime(),
        timestamp,
      });
    }

    const storage = await this.getStorageStatus();
    return {
      status: 'ok',
      db: { status: 'connected' },
      ...storage,
      uptime: process.uptime(),
      timestamp,
    };
  }

  async check() {
    return this.readiness();
  }

  private async checkDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('not_initialized');
    }
    await this.dataSource.query('SELECT 1');
  }

  private getDatabaseFailureReason(error: unknown): string {
    if (error instanceof Error && error.message === 'not_initialized') {
      return 'not_initialized';
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'string' && code.trim().length > 0) {
        return code;
      }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return 'query_failed';
    }

    return 'unknown';
  }

  private async getStorageStatus(): Promise<Pick<HealthResponse, 'storage' | 'storageReason'>> {
    try {
      return { storage: await this.checkStorage() };
    } catch (error) {
      const reason = this.getStorageFailureReason(error);
      this.logger.warn(`Health check storage dependency failed: ${reason}`);
      return { storage: 'disconnected', storageReason: reason };
    }
  }

  private getStorageFailureReason(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const name = (error as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim().length > 0) return name;
    }
    if (error instanceof Error && error.message.trim().length > 0) return 'head_bucket_failed';
    return 'unknown';
  }

  private async checkStorage(): Promise<'connected' | 'skipped'> {
    const bucket = process.env.AWS_S3_BUCKET_NAME ?? process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return 'skipped';
    }

    const clientConfig = {
      region,
      credentials: { accessKeyId, secretAccessKey },
    };
    const client = new S3Client({
      ...clientConfig,
    });
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return 'connected';
  }
}
