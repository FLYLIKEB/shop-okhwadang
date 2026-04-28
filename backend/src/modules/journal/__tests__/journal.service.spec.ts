import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { JournalService } from '../journal.service';
import { JournalCategory, JournalEntry } from '../entities/journal-entry.entity';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>
>;

function createRepoMock<T extends ObjectLiteral>(): RepoMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as RepoMock<T>;
}

describe('JournalService', () => {
  let service: JournalService;
  let repo: RepoMock<JournalEntry>;

  beforeEach(async () => {
    repo = createRepoMock<JournalEntry>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: getRepositoryToken(JournalEntry), useValue: repo },
      ],
    }).compile();

    service = module.get(JournalService);
  });

  describe('findAll', () => {
    it('카테고리 미지정 시 게시된 항목만 조회', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isPublished: true },
        order: { date: 'DESC' },
      });
    });

    it('카테고리 지정 시 where 에 카테고리 포함', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(JournalCategory.NEWS);

      expect(repo.find).toHaveBeenCalledWith({
        where: { isPublished: true, category: JournalCategory.NEWS },
        order: { date: 'DESC' },
      });
    });

    it('locale=en 이면 titleEn/contentEn 으로 덮어씀', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          slug: 's',
          title: '한글 제목',
          titleEn: 'English Title',
          subtitle: null,
          subtitleEn: 'EN sub',
          summary: '요약',
          summaryEn: 'EN summary',
          content: '본문',
          contentEn: 'EN content',
          isPublished: true,
        } as unknown as JournalEntry,
      ]);

      const [item] = await service.findAll(undefined, 'en');

      expect(item.title).toBe('English Title');
      expect(item.summary).toBe('EN summary');
      expect(item.content).toBe('EN content');
    });
  });

  describe('findAllAdmin', () => {
    it('isPublished 와 무관하게 전체 조회', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAllAdmin();

      expect(repo.find).toHaveBeenCalledWith({
        order: { date: 'DESC' },
      });
    });
  });

  describe('findBySlug', () => {
    it('없는 slug 조회 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as JournalEntry);

      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });

    it('정상 조회 시 locale 적용', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        slug: 's',
        title: '한글',
        titleEn: 'English',
      } as unknown as JournalEntry);

      const result = await service.findBySlug('s', 'en');

      expect(result.title).toBe('English');
    });
  });

  describe('findById', () => {
    it('없는 ID 조회 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as JournalEntry);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('repo.create -> save 순으로 호출', async () => {
      const dto = {
        slug: 's',
        title: '제목',
        category: JournalCategory.CULTURE,
        date: '2026-01-01',
      };
      const entity = { id: 1, ...dto } as unknown as JournalEntry;
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(entity);
    });
  });

  describe('update', () => {
    it('없는 ID 수정 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as JournalEntry);

      await expect(service.update(999, { title: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('기존 엔티티에 dto 머지 후 save', async () => {
      const existing = { id: 1, title: 'old' } as unknown as JournalEntry;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (entity: unknown) => entity as JournalEntry);

      const result = await service.update(1, { title: 'new' });

      expect(result.title).toBe('new');
    });
  });

  describe('delete', () => {
    it('없는 ID 삭제 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as JournalEntry);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('정상 삭제', async () => {
      const entity = { id: 1 } as JournalEntry;
      repo.findOne.mockResolvedValue(entity);
      repo.remove.mockResolvedValue(entity);

      await service.delete(1);

      expect(repo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
