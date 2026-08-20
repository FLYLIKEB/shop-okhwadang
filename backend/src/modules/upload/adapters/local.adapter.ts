import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageAdapter, UploadedFile } from '../interfaces/storage.interface';

const DEFAULT_LOCAL_UPLOAD_BASE_URL = 'http://localhost:3000';

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

  async saveCmsImage(
    filename: string,
    buffer: Buffer,
    _mimetype: string,
    variant: string,
  ): Promise<UploadedFile> {
    return this.saveToFolder(
      filename,
      buffer,
      path.join(this.uploadDir, 'cms', variant),
      `uploads/cms/${variant}`,
    );
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
    const relativeUrl = `/${urlPath}/${safeName}`;
    return {
      url: `${getLocalUploadBaseUrl()}${relativeUrl}`,
      filename: `${urlPath}/${safeName}`,
    };
  }
}

function getLocalUploadBaseUrl(): string {
  const configured =
    process.env.BACKEND_PUBLIC_URL ??
    process.env.BACKEND_URL ??
    process.env.API_PUBLIC_URL;

  if (configured?.trim()) {
    return configured.trim().replace(/\/$/, '');
  }

  const port = process.env.PORT || '3000';
  return port === '3000'
    ? DEFAULT_LOCAL_UPLOAD_BASE_URL
    : `http://localhost:${port}`;
}
