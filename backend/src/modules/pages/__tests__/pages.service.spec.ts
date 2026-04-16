import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PagesService } from '../pages.service';
import { Page } from '../entities/page.entity';
import { PageBlock } from '../entities/page-block.entity';

const mockPageRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockBlockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
};

describe('PagesService', () => {
  let service: PagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: getRepositoryToken(Page), useValue: mockPageRepository },
        { provide: getRepositoryToken(PageBlock), useValue: mockBlockRepository },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
    jest.clearAllMocks();
  });

  describe('findAllPublished', () => {
    it('공개된 페이지 목록을 반환한다', async () => {
      const pages = [{ id: 1, slug: 'home', is_published: true }];
      mockPageRepository.find.mockResolvedValue(pages);

      const result = await service.findAllPublished();
      expect(result).toEqual(pages);
      expect(mockPageRepository.find).toHaveBeenCalledWith({
        where: { is_published: true },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findBySlug', () => {
    it('공개된 페이지를 slug로 조회한다', async () => {
      const page = {
        id: 1,
        slug: 'home',
        is_published: true,
        blocks: [
          { id: 1, is_visible: true, sort_order: 2 },
          { id: 2, is_visible: false, sort_order: 1 },
          { id: 3, is_visible: true, sort_order: 0 },
        ],
      };
      mockPageRepository.findOne.mockResolvedValue(page);

      const result = await service.findBySlug('home');
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].sort_order).toBe(0);
      expect(result.blocks[1].sort_order).toBe(2);
    });

    it('존재하지 않는 slug → NotFoundException', async () => {
      mockPageRepository.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('locale=en일 때 page.title 및 block.content 내 *_en 필드가 적용된다', async () => {
      const page = {
        id: 1,
        slug: 'home',
        is_published: true,
        title: '홈',
        titleEn: 'Home',
        blocks: [
          {
            id: 1,
            is_visible: true,
            sort_order: 0,
            content: {
              title: '의흥 장인',
              title_en: 'Yixing Masters',
              subtitle: '600년',
              subtitle_en: '600 years',
              slides: [
                { title: '슬라이드1', title_en: 'Slide 1', cta_text: '보기', cta_text_en: 'View' },
              ],
            },
          },
        ],
      };
      mockPageRepository.findOne.mockResolvedValue(page);

      const result = await service.findBySlug('home', 'en');
      expect(result.title).toBe('Home');
      const block = result.blocks[0] as { content: Record<string, unknown> };
      expect(block.content.title).toBe('Yixing Masters');
      expect(block.content.subtitle).toBe('600 years');
      const slides = block.content.slides as Array<Record<string, unknown>>;
      expect(slides[0].title).toBe('Slide 1');
      expect(slides[0].cta_text).toBe('View');
    });

    it('locale=ko면 *_en 필드는 무시되고 원본 유지', async () => {
      const page = {
        id: 1,
        slug: 'home',
        is_published: true,
        title: '홈',
        titleEn: 'Home',
        blocks: [
          {
            id: 1,
            is_visible: true,
            sort_order: 0,
            content: { title: '의흥 장인', title_en: 'Yixing Masters' },
          },
        ],
      };
      mockPageRepository.findOne.mockResolvedValue(page);

      const result = await service.findBySlug('home', 'ko');
      expect(result.title).toBe('홈');
      const block = result.blocks[0] as { content: Record<string, unknown> };
      expect(block.content.title).toBe('의흥 장인');
    });
  });

  describe('create', () => {
    it('페이지를 생성한다', async () => {
      const dto = { slug: 'new-page', title: '새 페이지' };
      const created = { id: 1, ...dto };
      mockPageRepository.findOne.mockResolvedValue(null);
      mockPageRepository.create.mockReturnValue(created);
      mockPageRepository.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
    });

    it('slug 중복 → ConflictException', async () => {
      mockPageRepository.findOne.mockResolvedValue({ id: 1, slug: 'existing' });
      await expect(
        service.create({ slug: 'existing', title: '중복' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('페이지를 수정한다', async () => {
      const page = { id: 1, slug: 'old', title: '기존' };
      mockPageRepository.findOne.mockResolvedValue(page);
      mockPageRepository.save.mockResolvedValue({ ...page, title: '수정됨' });

      const result = await service.update(1, { title: '수정됨' });
      expect(result.title).toBe('수정됨');
    });

    it('존재하지 않는 페이지 → NotFoundException', async () => {
      mockPageRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, { title: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('slug 변경 시 중복 → ConflictException', async () => {
      const page = { id: 1, slug: 'page-a' };
      mockPageRepository.findOne
        .mockResolvedValueOnce(page)
        .mockResolvedValueOnce({ id: 2, slug: 'page-b' });

      await expect(service.update(1, { slug: 'page-b' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('비공개 페이지를 삭제한다', async () => {
      const page = { id: 1, is_published: false };
      mockPageRepository.findOne.mockResolvedValue(page);
      mockPageRepository.remove.mockResolvedValue(page);

      await service.remove(1);
      expect(mockPageRepository.remove).toHaveBeenCalledWith(page);
    });

    it('공개 중인 페이지 삭제 → BadRequestException', async () => {
      mockPageRepository.findOne.mockResolvedValue({ id: 1, is_published: true });
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 페이지 → NotFoundException', async () => {
      mockPageRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBlock', () => {
    it('블록을 생성한다', async () => {
      const dto = { type: 'hero_banner', content: { title: 'Hello' } };
      mockPageRepository.findOne.mockResolvedValue({ id: 1 });
      mockBlockRepository.create.mockReturnValue({ id: 1, ...dto, page_id: 1 });
      mockBlockRepository.save.mockResolvedValue({ id: 1, ...dto, page_id: 1 });

      const result = await service.createBlock(1, dto);
      expect(result.type).toBe('hero_banner');
    });

    it('존재하지 않는 페이지 → NotFoundException', async () => {
      mockPageRepository.findOne.mockResolvedValue(null);
      await expect(
        service.createBlock(999, { type: 'hero_banner', content: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('지원하지 않는 블록 타입 → BadRequestException', async () => {
      mockPageRepository.findOne.mockResolvedValue({ id: 1 });
      await expect(
        service.createBlock(1, { type: 'invalid_type', content: {} }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBlock', () => {
    it('블록을 수정한다', async () => {
      const block = { id: 1, page_id: 1, type: 'hero_banner', content: {} };
      mockBlockRepository.findOne.mockResolvedValue(block);
      mockBlockRepository.save.mockResolvedValue({ ...block, content: { title: 'Updated' } });

      const result = await service.updateBlock(1, 1, { content: { title: 'Updated' } });
      expect(result.content).toEqual({ title: 'Updated' });
    });

    it('존재하지 않는 블록 → NotFoundException', async () => {
      mockBlockRepository.findOne.mockResolvedValue(null);
      await expect(service.updateBlock(1, 999, { content: {} })).rejects.toThrow(NotFoundException);
    });

    it('지원하지 않는 블록 타입으로 수정 → BadRequestException', async () => {
      mockBlockRepository.findOne.mockResolvedValue({ id: 1, page_id: 1 });
      await expect(
        service.updateBlock(1, 1, { type: 'invalid_type' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeBlock', () => {
    it('블록을 삭제한다', async () => {
      const block = { id: 1, page_id: 1 };
      mockBlockRepository.findOne.mockResolvedValue(block);
      mockBlockRepository.remove.mockResolvedValue(block);

      await service.removeBlock(1, 1);
      expect(mockBlockRepository.remove).toHaveBeenCalledWith(block);
    });

    it('존재하지 않는 블록 → NotFoundException', async () => {
      mockBlockRepository.findOne.mockResolvedValue(null);
      await expect(service.removeBlock(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderBlocks', () => {
    it('블록 순서를 일괄 변경한다', async () => {
      mockPageRepository.findOne.mockResolvedValue({ id: 1 });
      mockBlockRepository.update.mockResolvedValue({ affected: 1 });

      await service.reorderBlocks(1, {
        orders: [
          { id: 1, sort_order: 2 },
          { id: 2, sort_order: 0 },
        ],
      });

      expect(mockBlockRepository.update).toHaveBeenCalledTimes(2);
    });

    it('존재하지 않는 페이지 → NotFoundException', async () => {
      mockPageRepository.findOne.mockResolvedValue(null);
      await expect(
        service.reorderBlocks(999, { orders: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
