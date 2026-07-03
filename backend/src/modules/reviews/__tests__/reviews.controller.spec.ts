import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ReviewsController } from '../reviews.controller';
import { ReviewsService } from '../reviews.service';
import { UploadService } from '../../upload/upload.service';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_INPUT_FILE_SIZE_BYTES } from '../../upload/upload.constants';

function expectMulterRejected(status: number): void {
  expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(status);
}

describe('ReviewsController multipart limits', () => {
  let app: INestApplication;
  let uploadService: jest.Mocked<Pick<UploadService, 'uploadImage'>>;

  beforeAll(async () => {
    uploadService = {
      uploadImage: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/uploads/review.jpg',
        filename: 'review.jpg',
      }),
    };

    const reviewsService = {
      findAll: jest.fn(),
      importSmartStoreReviews: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewsService, useValue: reviewsService },
        { provide: UploadService, useValue: uploadService },
      ],
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



  it('passes review images over the 20MB threshold to UploadService for resizing', async () => {
    const overResizeThreshold = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.alloc(MAX_UPLOAD_FILE_SIZE_BYTES + 1 - 4),
    ]);

    const res = await request(app.getHttpServer())
      .post('/reviews/upload-image')
      .attach('file', overResizeThreshold, {
        filename: 'needs-resize.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(uploadService.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ size: MAX_UPLOAD_FILE_SIZE_BYTES + 1 }),
    );
  });

  it('blocks oversized review image upload before UploadService.uploadImage', async () => {
    const oversized = Buffer.alloc(MAX_UPLOAD_INPUT_FILE_SIZE_BYTES + 1);

    const res = await request(app.getHttpServer())
      .post('/reviews/upload-image')
      .attach('file', oversized, {
        filename: 'oversized.png',
        contentType: 'image/png',
      });

    expectMulterRejected(res.status);
    expect(uploadService.uploadImage).not.toHaveBeenCalled();
  });
});
