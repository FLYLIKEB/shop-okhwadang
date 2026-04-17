import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InquiriesService } from '../inquiries.service';
import { Inquiry, InquiryType, InquiryStatus } from '../entities/inquiry.entity';

const mockRepo = () => ({
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

describe('InquiriesService', () => {
  let service: InquiriesService;
  let repo: jest.Mocked<Repository<Inquiry>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        { provide: getRepositoryToken(Inquiry), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<InquiriesService>(InquiriesService);
    repo = module.get(getRepositoryToken(Inquiry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('문의 작성 성공', async () => {
      const dto = { type: InquiryType.PRODUCT, title: '문의 제목', content: '내용' };
      const created = { id: 1, userId: 10, status: InquiryStatus.PENDING, ...dto };
      repo.create.mockReturnValue(created as never);
      repo.save.mockResolvedValue(created as never);

      const result = await service.create(10, dto);
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('타인 문의 조회 → ForbiddenException', async () => {
      const inquiry = { id: 1, userId: 99, title: '타인 문의' };
      repo.findOne.mockResolvedValue(inquiry as never);

      await expect(service.findOne(1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 문의 → NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('answer', () => {
    it('답변 작성 → status answered 변경', async () => {
      const inquiry = { id: 1, status: InquiryStatus.PENDING, answer: null } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue({ ...inquiry, status: InquiryStatus.ANSWERED, answer: '답변 내용' } as never);

      const result = await service.answerInquiry(1, { answer: '답변 내용' });
      expect(result.status).toBe(InquiryStatus.ANSWERED);
      expect(result.answer).toBe('답변 내용');
    });
  });
});
