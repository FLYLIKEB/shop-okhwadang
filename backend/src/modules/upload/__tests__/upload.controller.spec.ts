import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UploadController } from '../upload.controller';
import { MAX_UPLOAD_INPUT_FILE_SIZE_BYTES } from '../upload.constants';
import { UploadService } from '../upload.service';
import { RemoteImageIngestService } from '../remote-image-ingest.service';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
  'base64',
);

function expectMulterRejected(status: number): void {
  expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(status);
}

describe('UploadController multipart limits', () => {
  let app: INestApplication;
  let uploadService: jest.Mocked<Pick<UploadService, 'uploadImage' | 'uploadCategoryImage' | 'uploadCmsImage'>>;

  beforeAll(async () => {
    uploadService = {
      uploadImage: jest.fn(),
      uploadCategoryImage: jest.fn(),
      uploadCmsImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: uploadService },
        { provide: RemoteImageIngestService, useValue: { ingestCms: jest.fn() } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['hero', 'promotion', 'journal'])('accepts CMS multipart kind %s', async (kind) => {
    uploadService.uploadCmsImage.mockResolvedValue({ original: { url: '/image.png', filename: 'image.png' }, derivatives: {} });
    await request(app.getHttpServer()).post('/upload/cms-image').field('kind', kind)
      .attach('file', PNG_1X1, { filename: 'ok.png', contentType: 'image/png' }).expect(201);
    expect(uploadService.uploadCmsImage).toHaveBeenCalledWith(expect.objectContaining({ originalname: 'ok.png' }), kind);
  });

  it.each([{}, { kind: 'invalid' }, { caption: 'hero' }, { kind: 'hero', caption: 'extra' }])('rejects invalid CMS fields %j', async (fields) => {
    let pending = request(app.getHttpServer()).post('/upload/cms-image');
    for (const [key, value] of Object.entries(fields)) pending = pending.field(key, value);
    await pending.attach('file', PNG_1X1, { filename: 'ok.png', contentType: 'image/png' }).expect(400);
    expect(uploadService.uploadCmsImage).not.toHaveBeenCalled();
  });

  it('keeps CMS upload file-size and MIME restrictions', async () => {
    const oversized = await request(app.getHttpServer()).post('/upload/cms-image').field('kind', 'hero')
      .attach('file', Buffer.alloc(MAX_UPLOAD_INPUT_FILE_SIZE_BYTES + 1), { filename: 'large.png', contentType: 'image/png' });
    expectMulterRejected(oversized.status);
    await request(app.getHttpServer()).post('/upload/cms-image').field('kind', 'hero')
      .attach('file', PNG_1X1, { filename: 'invalid.txt', contentType: 'text/plain' }).expect(400);
    expect(uploadService.uploadCmsImage).not.toHaveBeenCalled();
  });

  it('blocks oversized admin image upload before UploadService.uploadImage', async () => {
    const oversized = Buffer.alloc(MAX_UPLOAD_INPUT_FILE_SIZE_BYTES + 1);

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
    const oversized = Buffer.alloc(MAX_UPLOAD_INPUT_FILE_SIZE_BYTES + 1);

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
