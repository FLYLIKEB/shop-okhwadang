import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { RemoteImageIngestService } from './remote-image-ingest.service';
import { LocalStorageAdapter } from './adapters/local.adapter';
import { MockStorageAdapter } from './adapters/mock.adapter';
import { S3StorageAdapter } from './adapters/s3.adapter';
import { storageConfigProvider } from '../../config/storage.config';
import { CmsMediaBackfillService } from './cms-media-backfill.service';

@Module({
  controllers: [UploadController],
  providers: [
    storageConfigProvider,
    UploadService,
    RemoteImageIngestService,
    CmsMediaBackfillService,
    LocalStorageAdapter,
    MockStorageAdapter,
    S3StorageAdapter,
  ],
  exports: [UploadService, RemoteImageIngestService, CmsMediaBackfillService],
})
export class UploadModule {}
