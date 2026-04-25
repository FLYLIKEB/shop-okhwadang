import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { S3StorageAdapter } from '../s3.adapter';
import { StorageConfig } from '../../../../config/storage.config';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn();
  return {
    __esModule: true,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ __type: 'put', input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ __type: 'delete', input })),
    __mockSend: send,
  };
});

const s3Module = jest.requireMock('@aws-sdk/client-s3') as {
  __mockSend: jest.Mock;
};

const baseConfig: StorageConfig = {
  provider: 's3',
  s3: {
    bucket: 'test-bucket',
    region: 'ap-northeast-2',
    cdnUrl: null,
    accessKeyId: 'AKIA-test',
    secretAccessKey: 'secret-test',
  },
};

describe('S3StorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    s3Module.__mockSend.mockResolvedValue({});
  });

  describe('생성자', () => {
    it('S3Client가 region/credentials와 함께 초기화됨', () => {
      new S3StorageAdapter(baseConfig);

      expect(S3Client).toHaveBeenCalledWith({
        region: 'ap-northeast-2',
        credentials: {
          accessKeyId: 'AKIA-test',
          secretAccessKey: 'secret-test',
        },
      });
    });
  });

  describe('save()', () => {
    it('products/ 폴더에 PutObjectCommand 전송', async () => {
      const adapter = new S3StorageAdapter(baseConfig);
      const buffer = Buffer.from('image-data');

      const result = await adapter.save('photo.jpg', buffer, 'image/jpeg');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'products/photo.jpg',
        Body: buffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });
      expect(s3Module.__mockSend).toHaveBeenCalledTimes(1);
      expect(result.filename).toBe('products/photo.jpg');
    });

    it('cdnUrl 미설정 시 S3 직접 URL 반환', async () => {
      const adapter = new S3StorageAdapter(baseConfig);
      const result = await adapter.save('photo.jpg', Buffer.from(''), 'image/jpeg');

      expect(result.url).toBe(
        'https://test-bucket.s3.ap-northeast-2.amazonaws.com/products/photo.jpg',
      );
    });

    it('cdnUrl 설정 시 CDN URL 반환', async () => {
      const adapter = new S3StorageAdapter({
        ...baseConfig,
        s3: { ...baseConfig.s3, cdnUrl: 'https://cdn.example.com' },
      });

      const result = await adapter.save('photo.jpg', Buffer.from(''), 'image/jpeg');

      expect(result.url).toBe('https://cdn.example.com/products/photo.jpg');
    });

    it('S3 전송 실패 시 reject', async () => {
      s3Module.__mockSend.mockRejectedValueOnce(new Error('S3 unreachable'));
      const adapter = new S3StorageAdapter(baseConfig);

      await expect(
        adapter.save('photo.jpg', Buffer.from(''), 'image/jpeg'),
      ).rejects.toThrow('S3 unreachable');
    });
  });

  describe('saveCategoryImage()', () => {
    it('categories/ 폴더에 저장', async () => {
      const adapter = new S3StorageAdapter(baseConfig);

      const result = await adapter.saveCategoryImage('cat.png', Buffer.from(''), 'image/png');

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'categories/cat.png',
          Bucket: 'test-bucket',
          ContentType: 'image/png',
          ACL: 'public-read',
        }),
      );
      expect(result.filename).toBe('categories/cat.png');
      expect(result.url).toContain('categories/cat.png');
    });
  });

  describe('delete()', () => {
    it('주어진 key로 DeleteObjectCommand 전송', async () => {
      const adapter = new S3StorageAdapter(baseConfig);

      await adapter.delete('products/photo.jpg');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'products/photo.jpg',
      });
      expect(s3Module.__mockSend).toHaveBeenCalledTimes(1);
    });

    it('S3 삭제 실패 시 reject', async () => {
      s3Module.__mockSend.mockRejectedValueOnce(new Error('Access denied'));
      const adapter = new S3StorageAdapter(baseConfig);

      await expect(adapter.delete('products/x.jpg')).rejects.toThrow('Access denied');
    });
  });
});
