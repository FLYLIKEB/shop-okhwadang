import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InquiriesService } from '../inquiries.service';
import { Inquiry, InquiryType, InquiryStatus } from '../entities/inquiry.entity';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';

const mockRepo = () => ({
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
});

describe('InquiriesService', () => {
  let service: InquiriesService;
  let repo: jest.Mocked<Repository<Inquiry>>;
  let mockNotificationService: { sendInquiryAnswered: jest.Mock };
  let mockNotificationDispatchHelper: { dispatch: jest.Mock };

  beforeEach(async () => {
    mockNotificationService = { sendInquiryAnswered: jest.fn().mockResolvedValue(undefined) };
    mockNotificationDispatchHelper = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        { provide: getRepositoryToken(Inquiry), useFactory: mockRepo },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: NotificationDispatchHelper, useValue: mockNotificationDispatchHelper },
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
      const inquiry = { id: 1, userId: 99, title: '타인 문의', answeredAt: null, customerReadAt: null };
      repo.findOne.mockResolvedValue(inquiry as never);

      await expect(service.findOne(1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 문의 → NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });

    it('답변 있고 customerReadAt 없으면 customerReadAt 갱신', async () => {
      const inquiry = {
        id: 1,
        userId: 10,
        title: '문의',
        answeredAt: new Date('2024-01-01'),
        customerReadAt: null,
      } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue({ ...inquiry, customerReadAt: new Date() } as never);

      const result = await service.findOne(1, 10);
      expect(repo.save).toHaveBeenCalled();
      expect(result.customerReadAt).toBeDefined();
    });

    it('이미 customerReadAt 있으면 save 호출 안 함', async () => {
      const inquiry = {
        id: 1,
        userId: 10,
        title: '문의',
        answeredAt: new Date('2024-01-01'),
        customerReadAt: new Date('2024-01-02'),
      } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);

      await service.findOne(1, 10);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('답변 없으면 customerReadAt 갱신 안 함', async () => {
      const inquiry = {
        id: 1,
        userId: 10,
        title: '문의',
        answeredAt: null,
        customerReadAt: null,
      } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);

      await service.findOne(1, 10);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('answerInquiry', () => {
    it('답변 작성 → status answered 변경', async () => {
      const inquiry = { id: 1, status: InquiryStatus.PENDING, answer: null, answeredAt: null } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue({ ...inquiry, status: InquiryStatus.ANSWERED, answer: '답변 내용', answeredAt: new Date() } as never);

      const result = await service.answerInquiry(1, { answer: '답변 내용' });
      expect(result.status).toBe(InquiryStatus.ANSWERED);
      expect(result.answer).toBe('답변 내용');
    });

    it('첫 답변 시 알림 발송 (fire-and-forget)', async () => {
      const inquiry = { id: 1, userId: 10, title: '문의', status: InquiryStatus.PENDING, answer: null, answeredAt: null } as Inquiry;
      const savedInquiry = { ...inquiry, status: InquiryStatus.ANSWERED, answer: '답변', answeredAt: new Date() } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue(savedInquiry as never);

      await service.answerInquiry(1, { answer: '답변' });

      expect(mockNotificationDispatchHelper.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'inquiry.answered',
          userId: 10,
          resourceId: 1,
          mode: 'fire-and-forget',
        }),
      );
    });

    it('재답변 시 알림 미발송', async () => {
      const inquiry = {
        id: 1,
        userId: 10,
        title: '문의',
        status: InquiryStatus.ANSWERED,
        answer: '이전 답변',
        answeredAt: new Date('2024-01-01'),
      } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue({ ...inquiry, answer: '수정 답변' } as never);

      await service.answerInquiry(1, { answer: '수정 답변' });

      expect(mockNotificationDispatchHelper.dispatch).not.toHaveBeenCalled();
    });

    it('재답변 시 customerReadAt을 null로 초기화하여 고객이 다시 읽도록 한다', async () => {
      const inquiry = {
        id: 1,
        userId: 10,
        title: '문의',
        status: InquiryStatus.ANSWERED,
        answer: '이전 답변',
        answeredAt: new Date('2026-01-01'),
        customerReadAt: new Date('2026-01-02'),  // 이미 읽음
      } as Inquiry;
      repo.findOne.mockResolvedValue(inquiry);
      repo.save.mockResolvedValue({ ...inquiry, answer: '수정된 답변', customerReadAt: null } as never);

      await service.answerInquiry(1, { answer: '수정된 답변' });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: '수정된 답변',
          customerReadAt: null,
        }),
      );
    });
  });

  describe('findAllForAdmin', () => {
    const buildMockQb = () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      return qb;
    };

    it('unread=true 필터 → answeredAt IS NOT NULL AND customerReadAt IS NULL', async () => {
      const mockQb = buildMockQb();

      await service.findAllForAdmin({ unread: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith('inquiry.answeredAt IS NOT NULL');
      expect(mockQb.andWhere).toHaveBeenCalledWith('inquiry.customerReadAt IS NULL');
    });

    it('unread 미지정 시 필터 없음', async () => {
      const mockQb = buildMockQb();

      await service.findAllForAdmin({});

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });
  });
});
