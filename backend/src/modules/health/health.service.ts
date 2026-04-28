import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

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

  async readiness() {
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('Database not initialized');
      }
      await this.dataSource.query('SELECT 1');

      const storage = await this.checkStorage();
      return {
        status: 'ok',
        db: 'connected',
        storage,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'disconnected',
        storage: 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async check() {
    return this.readiness();
  }

  private async checkStorage(): Promise<'connected' | 'skipped'> {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return 'skipped';
    }

    const client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return 'connected';
  }
}
