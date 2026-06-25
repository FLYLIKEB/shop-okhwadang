import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ReviewsController } from '../reviews.controller';
import { ReviewsService } from '../reviews.service';
import { UploadService } from '../../upload/upload.service';

const REVIEW_MAX_FILE_SIZE = 10 * 1024 * 1024;

function expectMulterRejected(status: number): void {
  expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(status);
}

describe('ReviewsController multipart limits', () => {
  let app: INestApplication;
  let uploadService: jest.Mocked<Pick<UploadService, 'uploadImage'>>;

  beforeAll(async () => {
    uploadService = {
      uploadImage: jest.fn(),
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

  it('blocks oversized review image upload before UploadService.uploadImage', async () => {
    const oversized = Buffer.alloc(REVIEW_MAX_FILE_SIZE + 1);

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
