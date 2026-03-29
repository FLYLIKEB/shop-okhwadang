import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UploadService } from '../upload.service';
import { LocalStorageAdapter } from '../adapters/local.adapter';
import { MockStorageAdapter } from '../adapters/mock.adapter';
import { S3StorageAdapter } from '../adapters/s3.adapter';

// Use mock adapter in tests
process.env.STORAGE_PROVIDER = 'mock';

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.alloc(100),
  size: 100,
  stream: null as never,
  destination: '',
  filename: 'test.jpg',
  path: '',
  ...overrides,
});

// Mock sharp to avoid native module in tests
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
  }));
});

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        LocalStorageAdapter,
        MockStorageAdapter,
        S3StorageAdapter,
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('MIME 검증 통과 — jpeg 허용', async () => {
    const file = makeFile({ mimetype: 'image/jpeg' });
    const result = await service.uploadImage(file);
    expect(result.url).toContain('/uploads/mock/');
    expect(result.filename).toMatch(/\.jpg$/);
  });

  it('MIME 검증 통과 — png 허용', async () => {
    const file = makeFile({ mimetype: 'image/png', originalname: 'img.png' });
    const result = await service.uploadImage(file);
    expect(result.url).toBeDefined();
  });

  it('MIME 검증 실패 — gif 거부', async () => {
    const file = makeFile({ mimetype: 'image/gif', originalname: 'anim.gif' });
    await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
  });

  it('파일 크기 초과 — 5MB 이상 거부', async () => {
    const file = makeFile({ size: 6 * 1024 * 1024 });
    await expect(service.uploadImage(file)).rejects.toThrow(PayloadTooLargeException);
  });

  it('UUID 재명명 확인 — 원본 파일명과 다름', async () => {
    const file = makeFile({ originalname: 'original-name.jpg' });
    const result = await service.uploadImage(file);
    expect(result.filename).not.toBe('original-name.jpg');
    expect(result.filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
    );
  });
});
