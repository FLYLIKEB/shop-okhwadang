import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

interface SingleFileMemoryUploadOptionsInput {
  fileSize: number;
  allowedMimeTypes?: readonly string[];
  invalidMimeMessage?: string;
}

interface MulterFileLimits {
  fileSize: number;
  files: 1;
  fields: 0;
}

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

type FileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => void;

export interface SingleFileMemoryUploadOptions {
  storage: ReturnType<typeof memoryStorage>;
  limits: MulterFileLimits;
  fileFilter?: FileFilter;
}

export function createSingleFileMemoryUploadOptions(
  input: SingleFileMemoryUploadOptionsInput,
): SingleFileMemoryUploadOptions {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: input.fileSize,
      files: 1,
      fields: 0,
    },
    ...(input.allowedMimeTypes
      ? {
          fileFilter: (
            _req: Request,
            file: Express.Multer.File,
            callback: FileFilterCallback,
          ): void => {
            if (!input.allowedMimeTypes!.some((mimeType) => mimeType === file.mimetype)) {
              callback(
                new BadRequestException(
                  input.invalidMimeMessage ?? '허용되지 않는 파일 형식입니다.',
                ),
                false,
              );
              return;
            }

            callback(null, true);
          },
        }
      : {}),
  };
}
