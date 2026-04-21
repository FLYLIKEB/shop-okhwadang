import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementBarsService } from '../announcement-bars.service';
import { AnnouncementBar } from '../entities/announcement-bar.entity';

const mockAnnouncementBarRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
};

const makeAnnouncementBar = (overrides: Partial<AnnouncementBar> = {}): AnnouncementBar => ({
  id: 1,
  message: '기본 메시지',
  message_en: 'Default message',
  href: '/products',
  sort_order: 0,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
} as AnnouncementBar);

describe('AnnouncementBarsService', () => {
  let service: AnnouncementBarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementBarsService,
        { provide: getRepositoryToken(AnnouncementBar), useValue: mockAnnouncementBarRepository },
      ],
    }).compile();

    service = module.get<AnnouncementBarsService>(AnnouncementBarsService);
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('활성 항목만 sort_order 순으로 조회한다', async () => {
      mockAnnouncementBarRepository.find.mockResolvedValue([makeAnnouncementBar()]);

      await service.findActive('ko');

      expect(mockAnnouncementBarRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { sort_order: 'ASC' },
      });
    });

    it('locale=en이면 message_en이 있으면 message로 치환한다', async () => {
      mockAnnouncementBarRepository.find.mockResolvedValue([
        makeAnnouncementBar({ message: '기본', message_en: 'English message' }),
      ]);

      const result = await service.findActive('en');

      expect(result[0].message).toBe('English message');
    });

    it('locale=en이어도 message_en이 비어있으면 message fallback을 유지한다', async () => {
      mockAnnouncementBarRepository.find.mockResolvedValue([
        makeAnnouncementBar({ message: '기본', message_en: null }),
      ]);

      const result = await service.findActive('en');

      expect(result[0].message).toBe('기본');
    });
  });

  describe('findAll', () => {
    it('관리자 목록은 활성/비활성 전체를 반환한다', async () => {
      mockAnnouncementBarRepository.find.mockResolvedValue([makeAnnouncementBar({ is_active: false })]);

      await service.findAll();

      expect(mockAnnouncementBarRepository.find).toHaveBeenCalledWith({
        order: { sort_order: 'ASC' },
      });
    });
  });

  describe('create', () => {
    it('생성 성공', async () => {
      const created = makeAnnouncementBar({ id: 10 });
      mockAnnouncementBarRepository.create.mockReturnValue(created);
      mockAnnouncementBarRepository.save.mockResolvedValue(created);

      const result = await service.create({
        message: '새 메시지',
        message_en: 'New message',
        href: '/journal',
        sort_order: 1,
        is_active: true,
      });

      expect(result).toEqual(created);
      expect(mockAnnouncementBarRepository.create).toHaveBeenCalled();
      expect(mockAnnouncementBarRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('update', () => {
    it('수정 성공', async () => {
      const existing = makeAnnouncementBar();
      const updated = makeAnnouncementBar({ message: '수정됨' });
      mockAnnouncementBarRepository.findOne.mockResolvedValue(existing);
      mockAnnouncementBarRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, { message: '수정됨' });

      expect(result.message).toBe('수정됨');
      expect(mockAnnouncementBarRepository.save).toHaveBeenCalled();
    });

    it('없는 ID 수정 시 NotFoundException', async () => {
      mockAnnouncementBarRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { message: '없음' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('삭제 성공', async () => {
      const existing = makeAnnouncementBar();
      mockAnnouncementBarRepository.findOne.mockResolvedValue(existing);
      mockAnnouncementBarRepository.remove.mockResolvedValue(existing);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockAnnouncementBarRepository.remove).toHaveBeenCalledWith(existing);
    });

    it('없는 ID 삭제 시 NotFoundException', async () => {
      mockAnnouncementBarRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('순서를 일괄 업데이트한다', async () => {
      mockAnnouncementBarRepository.update.mockResolvedValue({ affected: 1 });

      await service.reorder({
        orders: [
          { id: 1, sort_order: 3 },
          { id: 2, sort_order: 1 },
        ],
      });

      expect(mockAnnouncementBarRepository.update).toHaveBeenCalledTimes(2);
      expect(mockAnnouncementBarRepository.update).toHaveBeenCalledWith(1, { sort_order: 3 });
      expect(mockAnnouncementBarRepository.update).toHaveBeenCalledWith(2, { sort_order: 1 });
    });
  });
});
