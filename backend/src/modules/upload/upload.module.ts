import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalStorageAdapter } from './adapters/local.adapter';
import { MockStorageAdapter } from './adapters/mock.adapter';
import { S3StorageAdapter } from './adapters/s3.adapter';

@Module({
  controllers: [UploadController],
  providers: [UploadService, LocalStorageAdapter, MockStorageAdapter, S3StorageAdapter],
  exports: [UploadService],
})
export class UploadModule {}
