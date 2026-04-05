import { Injectable } from '@nestjs/common';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';

@Injectable()
export class MockStorageAdapter implements StorageAdapter {
  async save(filename: string, _buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    return {
      url: `/uploads/mock/${filename}`,
      filename,
    };
  }

  async saveCategoryImage(filename: string, _buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    return {
      url: `/uploads/mock/categories/${filename}`,
      filename: `categories/${filename}`,
    };
  }
}
