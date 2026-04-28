import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async save(filename: string, buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    return this.saveToFolder(filename, buffer, this.uploadDir, 'uploads');
  }

  async saveCategoryImage(filename: string, buffer: Buffer, _mimetype: string): Promise<UploadedFile> {
    const categoriesDir = path.join(this.uploadDir, 'categories');
    return this.saveToFolder(filename, buffer, categoriesDir, 'uploads/categories');
  }

  private async saveToFolder(filename: string, buffer: Buffer, dir: string, urlPath: string): Promise<UploadedFile> {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('잘못된 파일명입니다.');
    }
    await fs.mkdir(dir, { recursive: true });
    const safeName = path.basename(filename);
    const filePath = path.join(dir, safeName);
    if (!filePath.startsWith(path.resolve(dir))) {
      throw new BadRequestException('잘못된 파일명입니다.');
    }
    await fs.writeFile(filePath, buffer);
    return {
      url: `/${urlPath}/${safeName}`,
      filename: `${urlPath}/${safeName}`,
    };
  }
}
