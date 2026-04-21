import { createStorageConfig } from '../storage.config';

describe('createStorageConfig', () => {
  it('기본값(local, ap-northeast-2)을 사용한다', () => {
    const config = createStorageConfig({});

    expect(config.provider).toBe('local');
    expect(config.s3.region).toBe('ap-northeast-2');
  });

  it('unknown STORAGE_PROVIDER는 local로 fallback한다', () => {
    const config = createStorageConfig({
      STORAGE_PROVIDER: 'unknown',
    });

    expect(config.provider).toBe('local');
  });

  it('s3 provider 선택 시 자격증명을 반영한다', () => {
    const config = createStorageConfig({
      STORAGE_PROVIDER: 's3',
      AWS_S3_BUCKET_NAME: 'bucket',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'ak',
      AWS_SECRET_ACCESS_KEY: 'sk',
      AWS_CDN_URL: 'https://cdn.example.com',
    });

    expect(config.provider).toBe('s3');
    expect(config.s3).toMatchObject({
      bucket: 'bucket',
      region: 'us-east-1',
      accessKeyId: 'ak',
      secretAccessKey: 'sk',
      cdnUrl: 'https://cdn.example.com',
    });
  });
});
