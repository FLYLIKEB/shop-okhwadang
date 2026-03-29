import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NoticesService } from '../notices.service';
import { Notice } from '../entities/notice.entity';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('NoticesService', () => {
  let service: NoticesService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticesService,
        { provide: getRepositoryToken(Notice), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<NoticesService>(NoticesService);
    repo = module.get(getRepositoryToken(Notice));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('공지사항 목록 조회 - 고정 공지 포함', async () => {
      const mockNotices = [
        { id: 1, title: '필독', isPinned: true, isPublished: true, viewCount: 0 },
        { id: 2, title: '일반', isPinned: false, isPublished: true, viewCount: 0 },
      ] as Notice[];
      repo.find.mockResolvedValue(mockNotices);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(repo.find).toHaveBeenCalledWith({
        where: { isPublished: true },
        order: { isPinned: 'DESC', createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('상세 조회 성공 - viewCount 증가', async () => {
      const notice = { id: 1, title: '공지1', isPublished: true, viewCount: 5 } as Notice;
      repo.findOne.mockResolvedValue(notice);
      repo.update.mockResolvedValue({});

      const result = await service.findOne(1);
      expect(result.viewCount).toBe(6);
    });

    it('존재하지 않는 공지 → NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
