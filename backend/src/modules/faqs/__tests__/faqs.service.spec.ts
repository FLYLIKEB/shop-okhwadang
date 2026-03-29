import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaqsService } from '../faqs.service';
import { Faq } from '../entities/faq.entity';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

describe('FaqsService', () => {
  let service: FaqsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqsService,
        { provide: getRepositoryToken(Faq), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<FaqsService>(FaqsService);
    repo = module.get(getRepositoryToken(Faq));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('카테고리 필터 조회', async () => {
      const mockFaqs = [{ id: 1, category: '배송', question: 'Q1', sortOrder: 0 }] as Faq[];
      repo.find.mockResolvedValue(mockFaqs);

      const result = await service.findAll({ category: '배송' });
      expect(result).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { isPublished: true, category: '배송' },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });

    it('카테고리 없이 전체 조회', async () => {
      const mockFaqs = [
        { id: 1, category: '배송' },
        { id: 2, category: '결제' },
      ] as Faq[];
      repo.find.mockResolvedValue(mockFaqs);

      const result = await service.findAll({});
      expect(result).toHaveLength(2);
    });
  });
});
