import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UploadController } from '../upload.controller';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../upload.constants';
import { UploadService } from '../upload.service';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
  'base64',
);

function expectMulterRejected(status: number): void {
  expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(status);
}

describe('UploadController multipart limits', () => {
  let app: INestApplication;
  let uploadService: jest.Mocked<Pick<UploadService, 'uploadImage' | 'uploadCategoryImage'>>;

  beforeAll(async () => {
    uploadService = {
      uploadImage: jest.fn(),
      uploadCategoryImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: uploadService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks oversized admin image upload before UploadService.uploadImage', async () => {
    const oversized = Buffer.alloc(MAX_UPLOAD_FILE_SIZE_BYTES + 1);

    const res = await request(app.getHttpServer())
      .post('/upload/image')
      .attach('file', oversized, {
        filename: 'oversized.png',
        contentType: 'image/png',
      });

    expectMulterRejected(res.status);
    expect(uploadService.uploadImage).not.toHaveBeenCalled();
  });

  it('blocks oversized category image upload before UploadService.uploadCategoryImage', async () => {
    const oversized = Buffer.alloc(MAX_UPLOAD_FILE_SIZE_BYTES + 1);

    const res = await request(app.getHttpServer())
      .post('/upload/category-image')
      .attach('file', oversized, {
        filename: 'oversized.png',
        contentType: 'image/png',
      });

    expectMulterRejected(res.status);
    expect(uploadService.uploadCategoryImage).not.toHaveBeenCalled();
  });

  it('rejects extra multipart fields before the service layer', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload/image')
      .field('caption', 'not allowed')
      .attach('file', PNG_1X1, {
        filename: 'ok.png',
        contentType: 'image/png',
      });

    expectMulterRejected(res.status);
    expect(uploadService.uploadImage).not.toHaveBeenCalled();
  });
});
