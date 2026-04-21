import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UploadService } from '../upload.service';
import { LocalStorageAdapter } from '../adapters/local.adapter';
import { MockStorageAdapter } from '../adapters/mock.adapter';
import { S3StorageAdapter } from '../adapters/s3.adapter';

// Use mock adapter in tests
process.env.STORAGE_PROVIDER = 'mock';

// Real JPEG magic bytes: FF D8 FF
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
// Real PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A + IHDR chunk (25 bytes minimum)
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d,                           // IHDR chunk length
  0x49, 0x48, 0x44, 0x52,                           // "IHDR"
  0x00, 0x00, 0x00, 0x01,                           // width: 1
  0x00, 0x00, 0x00, 0x01,                           // height: 1
  0x08, 0x02, 0x00, 0x00, 0x00,                     // bit depth, color type, etc.
  0x90, 0x77, 0x53, 0xde,                           // CRC
]);
// HTML content disguised as image
const HTML_BUFFER = Buffer.from('<html><body>XSS</body></html>');

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: JPEG_MAGIC,
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

  describe('magic byte 검증', () => {
    it('실제 JPEG magic byte — 허용', async () => {
      const file = makeFile({ buffer: JPEG_MAGIC, mimetype: 'image/jpeg' });
      const result = await service.uploadImage(file);
      expect(result.url).toBeDefined();
    });

    it('실제 PNG magic byte — 허용', async () => {
      const file = makeFile({
        buffer: PNG_MAGIC,
        mimetype: 'image/png',
        originalname: 'img.png',
      });
      const result = await service.uploadImage(file);
      expect(result.url).toBeDefined();
    });

    it('Content-Type 위조 — HTML 버퍼를 image/jpeg로 업로드 시 거부', async () => {
      const file = makeFile({ buffer: HTML_BUFFER, mimetype: 'image/jpeg' });
      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('Content-Type 위조 — HTML 버퍼를 image/png로 업로드 시 거부', async () => {
      const file = makeFile({
        buffer: HTML_BUFFER,
        mimetype: 'image/png',
        originalname: 'evil.png',
      });
      await expect(service.uploadImage(file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadCategoryImage', () => {
    it('카테고리 이미지 업로드 성공 — categories/ 폴더에 저장', async () => {
      const file = makeFile({ mimetype: 'image/jpeg' });
      const result = await service.uploadCategoryImage(file);
      expect(result.url).toContain('/uploads/mock/categories/');
      expect(result.filename).toMatch(/^categories\/.+\.jpg$/);
    });

    it('PNG 카테고리 이미지 업로드 성공', async () => {
      const file = makeFile({ mimetype: 'image/png', originalname: 'cat.png' });
      const result = await service.uploadCategoryImage(file);
      expect(result.url).toContain('/uploads/mock/categories/');
      expect(result.filename).toMatch(/^categories\/.+\.png$/);
    });

    it('MIME 검증 실패 — gif 거부', async () => {
      const file = makeFile({ mimetype: 'image/gif', originalname: 'anim.gif' });
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(BadRequestException);
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(
        '허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)',
      );
    });

    it('파일 크기 초과 — 5MB 이상 거부', async () => {
      const file = makeFile({ size: 6 * 1024 * 1024 });
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(PayloadTooLargeException);
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(
        '파일 크기는 5MB를 초과할 수 없습니다.',
      );
    });

    it('UUID 재명명 확인 — 원본 파일명과 다름', async () => {
      const file = makeFile({ originalname: 'my-category.jpg' });
      const result = await service.uploadCategoryImage(file);
      expect(result.filename).not.toBe('my-category.jpg');
      expect(result.filename).toMatch(
        /^categories\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
      );
    });

    it('Content-Type 위조 — HTML 버퍼를 image/jpeg로 업로드 시 거부', async () => {
      const file = makeFile({ buffer: HTML_BUFFER, mimetype: 'image/jpeg' });
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(BadRequestException);
    });

    it('Content-Type 위조 — HTML 버퍼를 image/png로 업로드 시 거부', async () => {
      const file = makeFile({
        buffer: HTML_BUFFER,
        mimetype: 'image/png',
        originalname: 'evil.png',
      });
      await expect(service.uploadCategoryImage(file)).rejects.toThrow(BadRequestException);
    });
  });
});
