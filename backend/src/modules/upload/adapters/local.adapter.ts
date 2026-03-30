import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async save(filename: string, buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const safeName = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeName);
    if (!filePath.startsWith(this.uploadDir)) throw new Error('Invalid filename');
    await fs.writeFile(filePath, buffer);
    return {
      url: `/uploads/${filename}`,
      filename,
    };
  }
}
