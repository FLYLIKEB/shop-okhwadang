import { Provider } from '@nestjs/common';

export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');

export type StorageProviderName = 'local' | 'mock' | 's3';

export interface StorageConfig {
  provider: StorageProviderName;
  s3: {
    bucket: string;
    region: string;
    cdnUrl: string | null;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

function resolveStorageProvider(rawProvider: string | undefined): StorageProviderName {
  const provider = rawProvider?.trim().toLowerCase();

  switch (provider) {
    case 's3':
      return 's3';
    case 'mock':
      return 'mock';
    case 'local':
    default:
      return 'local';
  }
}

export function createStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  return {
    provider: resolveStorageProvider(env.STORAGE_PROVIDER),
    s3: {
      bucket: env.AWS_S3_BUCKET_NAME ?? '',
      region: env.AWS_REGION ?? 'ap-northeast-2',
      cdnUrl: env.AWS_CDN_URL ?? null,
      accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  };
}

export const storageConfigProvider: Provider = {
  provide: STORAGE_CONFIG,
  useFactory: () => createStorageConfig(),
};
